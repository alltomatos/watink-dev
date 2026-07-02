#!/usr/bin/env python3
"""
Watink Smoke Tests — validates DI-pure endpoints after refactoring.
Run: python3 scripts/smoke_test.py [--base-url http://localhost:8082/api/v1]

Modes:
  --mode api     Business API endpoints (default)
  --mode docker  Full stack Docker health (containers + infra + API)
"""
import argparse
import json
import subprocess
import sys

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run: pip install requests")
    sys.exit(2)


# ──────────────────────────────────────────
# Docker / Infrastructure checks
# ──────────────────────────────────────────

REQUIRED_CONTAINERS = [
    "watink-business",
    "watink-engine",
    "watink-frontend",
    "watink-postgres",
    "watink-redis",
    "watink-rabbitmq",
    "watink-plugin-manager",
    "watink-hub",
]


def _docker_inspect_status(name: str) -> str:
    try:
        r = subprocess.run(
            ["docker", "inspect", "-f", "{{.State.Status}}", name],
            capture_output=True, text=True, timeout=10,
        )
        return r.stdout.strip() or "missing"
    except Exception:
        return "missing"


def _docker_exec(cmd: list, timeout: int = 10) -> str:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip()
    except Exception as e:
        return f"ERROR: {e}"


def check_containers() -> list:
    results = []
    for name in REQUIRED_CONTAINERS:
        status = _docker_inspect_status(name)
        results.append((f"container:{name}", status == "running", status))
    return results


def check_infrastructure() -> list:
    results = []

    # PostgreSQL
    pg = _docker_exec(["docker", "exec", "watink-postgres", "pg_isready", "-U", "postgres"])
    results.append(("infra:postgres", "accepting" in pg, pg))

    # Redis
    rd = _docker_exec(["docker", "exec", "watink-redis", "redis-cli", "ping"])
    results.append(("infra:redis", rd == "PONG", rd))

    # RabbitMQ Management
    try:
        r = requests.get("http://localhost:15672/", timeout=5)
        results.append(("infra:rabbitmq-mgmt", r.status_code == 200, r.status_code))
    except Exception as e:
        results.append(("infra:rabbitmq-mgmt", False, str(e)))

    return results


def check_error_patterns(minutes: int = 5) -> list:
    results = []
    critical = "panic|fatal|segfault|out of memory"
    for name in REQUIRED_CONTAINERS:
        try:
            r = subprocess.run(
                ["docker", "logs", name, "--since", f"{minutes}m"],
                capture_output=True, text=True, timeout=15,
            )
            count = 0
            for line in r.stdout.splitlines() + r.stderr.splitlines():
                if any(p in line.lower() for p in critical.split("|")):
                    # Filter known benign warnings
                    if "role" in line.lower() and "does not exist" in line.lower():
                        continue
                    if "deprecated" in line.lower():
                        continue
                    count += 1
            results.append((f"errors:{name}", count == 0, f"{count} critical lines"))
        except Exception as e:
            results.append((f"errors:{name}", False, str(e)))
    return results


# ──────────────────────────────────────────
# API Smoke Tests
# ──────────────────────────────────────────

def run_api_smoke(base_url: str, email: str, password: str) -> list:
    results = []
    creds = {"email": email, "password": password}

    # 1. Health (public)
    try:
        r = requests.get(f"{base_url}/health", timeout=10)
        results.append(("api:health", r.status_code == 200, r.status_code))
    except Exception as e:
        results.append(("api:health", False, str(e)))

    # 2. Initial setup check (public)
    try:
        r = requests.get(f"{base_url}/initial-setup/check", timeout=10)
        results.append(("api:setup-check", r.status_code in (200, 403), r.status_code))
    except Exception as e:
        results.append(("api:setup-check", False, str(e)))

    # 3. Login (public)
    login_ok = False
    login_resp = None
    try:
        login_resp = requests.post(f"{base_url}/auth/login", json=creds, timeout=10)
        login_ok = login_resp.status_code == 200
        results.append(("api:login", login_ok, login_resp.status_code))
    except Exception as e:
        results.append(("api:login", False, str(e)))

    # 4-10. Protected CRUD endpoints — ONLY if login succeeded
    if not login_ok:
        results.append(("api:protected-skipped", False, "login failed — cannot test protected routes"))
        # Still test unauth block
        try:
            resp = requests.get(f"{base_url}/tickets", timeout=10)
            results.append(("api:unauthorized_blocked", resp.status_code == 401, resp.status_code))
        except Exception as e:
            results.append(("api:unauthorized_blocked", False, str(e)))
        return results

    if login_resp is None:
        results.append(("api:login-error", False, "login_resp is None"))
        return results

    token = login_resp.json().get("token")
    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {token}"})
    session.cookies.update(login_resp.cookies)

    # Protected CRUD endpoints
    protected_endpoints = [
        ("api:tickets", "/tickets"),
        ("api:contacts", "/contacts"),
        ("api:whatsapp", "/whatsapp"),
        ("api:users", "/users"),
        ("api:queue", "/queue"),
        ("api:settings", "/settings"),
        ("api:dashboard", "/dashboard"),
    ]
    for name, path in protected_endpoints:
        try:
            resp = session.get(f"{base_url}{path}", timeout=10)
            results.append((name, resp.status_code == 200, resp.status_code))
        except Exception as e:
            results.append((name, False, str(e)))

    # Refresh token
    try:
        resp = session.post(f"{base_url}/auth/refresh_token", timeout=10)
        results.append(("api:refresh_token", resp.status_code == 200, resp.status_code))
    except Exception as e:
        results.append(("api:refresh_token", False, str(e)))

    # Unauthorized access blocked
    try:
        resp = requests.get(f"{base_url}/tickets", timeout=10)
        results.append(("api:unauthorized_blocked", resp.status_code == 401, resp.status_code))
    except Exception as e:
        results.append(("api:unauthorized_blocked", False, str(e)))

    # Logout
    try:
        resp = session.delete(f"{base_url}/auth/logout", timeout=10)
        results.append(("api:logout", resp.status_code == 200, resp.status_code))
    except Exception as e:
        results.append(("api:logout", False, str(e)))

    return results


# ──────────────────────────────────────────
# Report
# ──────────────────────────────────────────

def report(results: list, as_json: bool = False) -> int:
    if as_json:
        output = [{"test": n, "passed": p, "detail": str(d)} for n, p, d in results]
        print(json.dumps(output, indent=2))
    else:
        print("=" * 60)
        print("  WATINK SMOKE TEST REPORT")
        print("=" * 60)
        for name, passed, detail in results:
            icon = "PASS" if passed else "FAIL"
            print(f"  [{icon:4s}] {name:30s} {detail}")
        print()

    failed = [n for n, p, _ in results if not p]
    passed_count = len(results) - len(failed)
    total = len(results)
    print(f"  Total: {total} | Pass: {passed_count} | Fail: {len(failed)}")
    print()

    if failed:
        print(f"  FAILED: {failed}")
        return 1
    else:
        print(f"  ALL {total} TESTS PASSED")
        return 0


# ──────────────────────────────────────────
# Main
# ──────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Watink Smoke Tests")
    parser.add_argument("--base-url", default="http://localhost:8082/api/v1")
    parser.add_argument("--email", default="admin@test.com")
    parser.add_argument("--password", default="test1234")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument(
        "--mode",
        choices=["api", "docker", "full"],
        default="full",
        help="api=Business API only, docker=containers+infra, full=all (default)",
    )
    args = parser.parse_args()

    results = []

    if args.mode in ("docker", "full"):
        results += check_containers()
        results += check_infrastructure()
        results += check_error_patterns()

    if args.mode in ("api", "full"):
        results += run_api_smoke(args.base_url, args.email, args.password)

    exit_code = report(results, as_json=args.json)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()

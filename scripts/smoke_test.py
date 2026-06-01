#!/usr/bin/env python3
"""
Watink Smoke Tests — validates DI-pure endpoints after refactoring.
Run: python3 scripts/smoke_test.py [--base-url http://localhost:8082/api/v1]
"""
import argparse
import json
import sys
import requests


def run_smoke(base_url: str, email: str, password: str) -> list:
    results = []
    creds = {"email": email, "password": password}

    # 1. Health (public)
    try:
        r = requests.get(f"{base_url}/health", timeout=10)
        results.append(("health", r.status_code == 200, r.status_code))
    except Exception as e:
        results.append(("health", False, str(e)))

    # 2. Login (public)
    try:
        r = requests.post(f"{base_url}/auth/login", json=creds, timeout=10)
        results.append(("login", r.status_code == 200, r.status_code))
    except Exception as e:
        results.append(("login", False, str(e)))
        return results

    if r.status_code != 200:
        return results

    token = r.json().get("token")
    headers = {"Authorization": f"Bearer {token}"}
    session = requests.Session()
    session.headers.update(headers)
    session.cookies.update(r.cookies)

    # 3-7. Protected CRUD endpoints
    protected_endpoints = [
        ("tickets", "/tickets"),
        ("contacts", "/contacts"),
        ("whatsapp", "/whatsapp"),
        ("users", "/users"),
        ("queue", "/queue"),
        ("settings", "/settings"),
        ("dashboard", "/dashboard"),
    ]
    for name, path in protected_endpoints:
        try:
            resp = session.get(f"{base_url}{path}", timeout=10)
            results.append((name, resp.status_code == 200, resp.status_code))
        except Exception as e:
            results.append((name, False, str(e)))

    # 8. Refresh token
    try:
        resp = session.post(f"{base_url}/auth/refresh_token", timeout=10)
        results.append(("refresh_token", resp.status_code == 200, resp.status_code))
    except Exception as e:
        results.append(("refresh_token", False, str(e)))

    # 9. Unauthorized access blocked
    try:
        resp = requests.get(f"{base_url}/tickets", timeout=10)
        results.append(("unauthorized_blocked", resp.status_code == 401, resp.status_code))
    except Exception as e:
        results.append(("unauthorized_blocked", False, str(e)))

    # 10. Logout
    try:
        resp = session.delete(f"{base_url}/auth/logout", timeout=10)
        results.append(("logout", resp.status_code == 200, resp.status_code))
    except Exception as e:
        results.append(("logout", False, str(e)))

    return results


def main():
    parser = argparse.ArgumentParser(description="Watink Smoke Tests")
    parser.add_argument("--base-url", default="http://localhost:8082/api/v1")
    parser.add_argument("--email", default="admin@test.com")
    parser.add_argument("--password", default="test123")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    results = run_smoke(args.base_url, args.email, args.password)

    if args.json:
        output = []
        for name, passed, detail in results:
            output.append({"test": name, "passed": passed, "detail": detail})
        print(json.dumps(output, indent=2))
    else:
        print("=" * 55)
        print("  WATINK SMOKE TEST REPORT")
        print("=" * 55)
        for name, passed, detail in results:
            icon = "PASS" if passed else "FAIL"
            print(f"  [{icon:4s}] {name:25s} {detail}")
        print()

    failed = [n for n, p, _ in results if not p]
    if failed:
        print(f"FAILED: {failed}")
        sys.exit(1)
    else:
        total = len(results)
        print(f"ALL {total} TESTS PASSED")
        sys.exit(0)


if __name__ == "__main__":
    main()

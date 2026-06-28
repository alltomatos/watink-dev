from app.urls import rewrite_host


def test_rewrite_localhost():
    assert (
        rewrite_host("http://localhost:20128/v1", "host.docker.internal")
        == "http://host.docker.internal:20128/v1"
    )


def test_rewrite_127():
    assert (
        rewrite_host("http://127.0.0.1:20128/v1", "host.docker.internal")
        == "http://host.docker.internal:20128/v1"
    )


def test_noop_real_domain():
    url = "https://api.example.com/v1"
    assert rewrite_host(url, "host.docker.internal") == url


def test_noop_empty_inputs():
    assert rewrite_host("", "host.docker.internal") == ""
    assert rewrite_host("http://localhost/v1", "") == "http://localhost/v1"

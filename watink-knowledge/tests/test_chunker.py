from app.chunker import chunk_text


def test_empty_returns_no_chunks():
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_short_text_is_single_chunk():
    assert chunk_text("Funciona das 9h às 18h.") == ["Funciona das 9h às 18h."]


def test_long_text_splits_into_multiple_chunks_with_overlap():
    text = " ".join(f"palavra{i}" for i in range(1500))
    chunks = chunk_text(text, max_tokens=100, overlap=20)
    assert len(chunks) > 1
    assert all(c.strip() for c in chunks)


def test_overlap_smaller_than_window_makes_progress():
    text = " ".join(str(i) for i in range(500))
    chunks = chunk_text(text, max_tokens=50, overlap=10)
    # step = 40 tokens; must terminate and cover the input in a bounded number of chunks
    assert 1 < len(chunks) < 100

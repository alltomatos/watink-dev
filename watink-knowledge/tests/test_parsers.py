from app.parsers import extract_text


def test_txt_plain_decode():
    assert extract_text("notas.txt", b"linha um\nlinha dois") == "linha um\nlinha dois"


def test_md_plain_decode():
    assert extract_text("README.md", b"# Titulo\ncorpo") == "# Titulo\ncorpo"


def test_unknown_extension_uses_plain_decode():
    # Sem sufixo conhecido cai no decode utf-8 plano.
    assert extract_text("arquivo.xyz", b"conteudo livre") == "conteudo livre"
    assert extract_text("sem_extensao", b"abc") == "abc"


def test_invalid_utf8_is_ignored_not_raised():
    # bytes inválidos não levantam: caracteres ruins são descartados.
    out = extract_text("ruim.txt", b"ok\xff\xfetail")
    assert "ok" in out
    assert "tail" in out


def test_csv_extracts_non_empty_cells():
    data = b"nome,idade\nAna,30\nBruno,25\n"
    out = extract_text("dados.csv", data)
    assert "nome" in out
    assert "Ana" in out
    assert "30" in out
    # células vazias não geram colunas vazias no output
    assert extract_text("vazio.csv", b",,\n") == ""


def test_empty_bytes_returns_empty_for_text():
    assert extract_text("vazio.txt", b"") == ""


def test_empty_bytes_returns_empty_for_pdf():
    # PDF com bytes vazios não tem texto extraível; parser engole o erro e retorna "".
    assert extract_text("vazio.pdf", b"") == ""


def test_empty_bytes_returns_empty_for_docx():
    assert extract_text("vazio.docx", b"") == ""


def test_empty_bytes_returns_empty_for_xlsx():
    assert extract_text("vazio.xlsx", b"") == ""

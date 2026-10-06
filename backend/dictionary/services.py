import requests


def translate_text(text: str, source_lang: str = "en", target_lang: str = "uk") -> str:
    cleaned_text = text.strip()
    if not cleaned_text:
        return ""
    try:
        url = "https://api.mymemory.translated.net/get"
        params = {
            "q": text,
            "langpair": f"{source_lang}|{target_lang}",
        }
        res = requests.get(url, params=params, timeout=5)
        if res.status_code == 200:
            data = res.json()
            return data.get("responseData", {}).get("translatedText", "")

    except Exception as exc:
        print(f"Translation error: {exc}")
        return ""

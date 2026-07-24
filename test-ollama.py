import json, urllib.request

OLLAMA_HOST = "http://localhost:11434"
MODEL = "qwen2.5:7b"

def chat(messages, system=None, temperature=0.7):
    if system:
        messages = [{"role": "system", "content": system}] + messages
    data = json.dumps({
        "model": MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": temperature}
    }).encode()
    req = urllib.request.Request(
        f"{OLLAMA_HOST}/api/chat",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    resp = json.loads(urllib.request.urlopen(req).read().decode())
    return resp["message"]["content"]

# Test: Real estate content generation
prompts = [
    "Write a 2-line Instagram caption for a luxury 4-bedroom duplex in Banana Island, Lagos. Use emojis.",
    "Write a short Twitter post (under 280 chars) about a new real estate listing opening soon in Lekki Phase 1.",
    "Summarize this listing in 1 sentence: '3-bedroom apartment, 2 bathrooms, modern kitchen, 24hr security, swimming pool, gym, 5-min walk to Victoria Island business district.'"
]

system_prompt = "You are a real estate social media manager. Write engaging, professional posts."

for i, prompt in enumerate(prompts, 1):
    print(f"\n{'='*60}")
    print(f"PROMPT {i}: {prompt[:80]}...")
    print(f"{'='*60}")
    result = chat([{"role": "user", "content": prompt}], system=system_prompt)
    print(f"RESULT: {result}")

import urllib.request
import json
req = urllib.request.Request('http://127.0.0.1:8000/api/demo/analyze', data=b'{"github_url":"https://github.com/psf/requests"}', headers={'Content-Type': 'application/json'})
try:
    print("Sending POST request...")
    res = urllib.request.urlopen(req)
    print("Response status:", res.status)
    body = res.read().decode('utf-8')
    print("Body:", body)
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print("Error body:", e.read().decode('utf-8'))

import requests, json, base64, os
from dotenv import load_dotenv
load_dotenv()
ch_key = os.environ.get("COMPANIES_HOUSE_API_KEY", "")
auth = base64.b64encode(f"{ch_key}:".encode()).decode()
headers = {"Authorization": f"Basic {auth}"}
psc_r = requests.get("https://api.company-information.service.gov.uk/company/02366661/persons-with-significant-control", headers=headers, timeout=10)
print("PSCs:")
for item in psc_r.json().get("items", []):
    print(f"  name={item.get('name')} | country={item.get('country_of_residence')} | kind={item.get('kind')} | natures={item.get('natures_of_control')}")
officers_r = requests.get("https://api.company-information.service.gov.uk/company/02366661/officers", headers=headers, timeout=10)
active = [o for o in officers_r.json().get("items", []) if not o.get("resigned_on")]
print(f"\nActive officers count: {len(active)}")

let staffPrompted = false;

async function staffRequest(payload, write = false) {
  if (!USE_NEW_BACKEND) return apiRequest(payload, write);

  let staffKey = sessionStorage.getItem("f1StaffKey");
  if (!staffKey && !staffPrompted) {
    staffPrompted = true;
    staffKey = window.prompt("請輸入工作人員通行碼")?.trim();
  }
  if (!staffKey) return {error: "請重新整理並輸入工作人員通行碼"};

  const result = await apiRequest({...payload, staffKey}, true);
  if (!result.error) sessionStorage.setItem("f1StaffKey", staffKey);
  if (["請輸入工作人員通行碼", "沒有操作權限"].includes(result.error)) {
    sessionStorage.removeItem("f1StaffKey");
    staffPrompted = false;
  }
  return result;
}

function passengerLookup(phone, name) {
  return apiRequest({action: "findPassenger", phone, name}, USE_NEW_BACKEND);
}

async function apiRequest(payload, post) {
  const response = post
    ? await fetch(API, {method: "POST", body: JSON.stringify(payload)})
    : await fetch(API + "?" + new URLSearchParams(payload));
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}

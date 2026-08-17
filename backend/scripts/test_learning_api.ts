import axios from "axios";

async function testLearningEndpoints() {
  const baseURL = "http://localhost:4100/api/v1";
  const workspaceId = "23aed916-2e39-4c0e-8172-791db9afbd1b";
  try {
    console.log("Testing GET /org/learning/summary...");
    const summaryRes = await axios.get(`${baseURL}/org/learning/summary?workspaceId=${workspaceId}`);
    console.log("Summary status:", summaryRes.status, "data:", summaryRes.data);

    console.log("Testing GET /org/learning/plans...");
    const plansRes = await axios.get(`${baseURL}/org/learning/plans?workspaceId=${workspaceId}`);
    console.log("Plans status:", plansRes.status, "data:", plansRes.data);
  } catch (err: any) {
    console.error("Test failed with status:", err.response?.status, "data:", err.response?.data || err.message);
  }
}

testLearningEndpoints();

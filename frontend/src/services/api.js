const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_BASE = `${BASE_URL}/api`;

const SERVER_ERROR_MSG = "Unable to connect to the EchoHire server. Please make sure the backend is running.";

function getAuthHeaders() {
  const token = localStorage.getItem("echohire_auth_token");
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Health Check Endpoint
 */
export async function fetchHealthApi() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return await res.json();
  } catch (err) {
    console.error("Health check error:", err);
    return { success: false, message: SERVER_ERROR_MSG };
  }
}

/**
 * Authentication Endpoints
 */
export async function loginUser(email, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return await res.json();
  } catch (err) {
    console.error("Login API error:", err);
    return { success: false, message: SERVER_ERROR_MSG };
  }
}

export async function registerUser(userData) {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    return await res.json();
  } catch (err) {
    console.error("Register API error:", err);
    return { success: false, message: SERVER_ERROR_MSG };
  }
}

export async function fetchCurrentUserApi() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err) {
    console.error("Fetch current user error:", err);
    return { success: false, message: SERVER_ERROR_MSG };
  }
}

export async function fetchUserProfileApi(userId) {
  try {
    const res = await fetch(`${API_BASE}/auth/users/${userId}`, {
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err) {
    console.error("Fetch profile error:", err);
    return { success: false, message: SERVER_ERROR_MSG };
  }
}

export async function updateProfileApi(userId, profileData) {
  try {
    const res = await fetch(`${API_BASE}/auth/users/${userId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    return await res.json();
  } catch (err) {
    console.error("Update profile error:", err);
    return { success: false, message: SERVER_ERROR_MSG };
  }
}

/**
 * Jobs Endpoints
 */
export async function fetchJobsApi(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${API_BASE}/jobs?${query}` : `${API_BASE}/jobs`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) return data.jobs;
    return null;
  } catch (err) {
    console.error("Fetch jobs error:", err);
    return null;
  }
}

export async function fetchMyJobsApi() {
  try {
    const res = await fetch(`${API_BASE}/jobs/recruiter/my-jobs`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) return data.jobs;
    return null;
  } catch (err) {
    console.error("Fetch my jobs error:", err);
    return null;
  }
}

export async function fetchRecruiterJobsApi(recruiterId) {
  try {
    const res = await fetch(`${API_BASE}/jobs/recruiter/${recruiterId}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) return data.jobs;
    return null;
  } catch (err) {
    console.error("Fetch recruiter jobs error:", err);
    return null;
  }
}

export async function fetchJobByIdApi(jobId) {
  try {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`);
    const data = await res.json();
    if (data.success) return data.job;
    return null;
  } catch (err) {
    console.error("Fetch job by ID error:", err);
    return null;
  }
}

export async function createJobApi(jobData) {
  try {
    const res = await fetch(`${API_BASE}/jobs`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(jobData),
    });
    return await res.json();
  } catch (err) {
    console.error("Create job error:", err);
    return { success: false, message: SERVER_ERROR_MSG };
  }
}

export async function updateJobApi(jobId, jobData) {
  try {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(jobData),
    });
    return await res.json();
  } catch (err) {
    console.error("Update job error:", err);
    return { success: false, message: SERVER_ERROR_MSG };
  }
}

export async function deleteJobApi(jobId) {
  try {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err) {
    console.error("Delete job error:", err);
    return { success: false, message: SERVER_ERROR_MSG };
  }
}

/**
 * Saved Jobs Endpoints
 */
export async function fetchSavedJobsApi(userId) {
  try {
    const url = userId ? `${API_BASE}/saved-jobs/${userId}` : `${API_BASE}/saved-jobs`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) return data.savedJobIds;
    return null;
  } catch (err) {
    console.error("Fetch saved jobs error:", err);
    return null;
  }
}

export async function saveJobApi(userId, jobId) {
  try {
    const targetJobId = jobId || userId;
    const uid = userId || "user-seeker-1";
    const token = localStorage.getItem("echohire_auth_token");

    let res;
    if (token) {
      res = await fetch(`${API_BASE}/saved-jobs/${targetJobId}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
    }

    if (!res || res.status === 401 || !res.ok) {
      res = await fetch(`${API_BASE}/saved-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, jobId: targetJobId }),
      });
    }

    return await res.json();
  } catch (err) {
    console.error("Save job error:", err);
    return { success: false, message: SERVER_ERROR_MSG };
  }
}

export async function removeSavedJobApi(userId, jobId) {
  try {
    const uid = userId || "user-seeker-1";
    const jid = jobId || userId;
    const url = `${API_BASE}/saved-jobs/${uid}/${jid}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return await res.json();
  } catch (err) {
    console.error("Remove saved job error:", err);
    return { success: false, message: SERVER_ERROR_MSG };
  }
}

export async function toggleSavedJobApi(userId, jobId, isRemoving = false) {
  if (isRemoving) {
    return await removeSavedJobApi(userId, jobId);
  }
  return await saveJobApi(userId, jobId);
}

/**
 * Applications Endpoints
 */
export async function fetchMyApplicationsApi() {
  try {
    const res = await fetch(`${API_BASE}/applications/my-applications`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) return data.applications;
    return null;
  } catch (err) {
    console.error("Fetch my applications error:", err);
    return null;
  }
}

export async function fetchMyCandidatesApi() {
  try {
    const res = await fetch(`${API_BASE}/applications/recruiter/my-candidates`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) return data.applications;
    return null;
  } catch (err) {
    console.error("Fetch my candidates error:", err);
    return null;
  }
}

export async function fetchApplicationsApi(userId) {
  try {
    const url = userId ? `${API_BASE}/applications/${userId}` : `${API_BASE}/applications`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) return data.applications;
    return null;
  } catch (err) {
    console.error("Fetch applications error:", err);
    return null;
  }
}

export async function fetchRecruiterApplicationsApi(recruiterId) {
  try {
    const res = await fetch(`${API_BASE}/applications/recruiter/${recruiterId}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) return data.applications;
    return null;
  } catch (err) {
    console.error("Fetch recruiter applications error:", err);
    return null;
  }
}

export async function submitApplicationApi(appData) {
  try {
    const res = await fetch(`${API_BASE}/applications`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(appData),
    });
    return await res.json();
  } catch (err) {
    console.error("Submit application error:", err);
    return { success: false, message: SERVER_ERROR_MSG };
  }
}

export async function updateApplicationStatusApi(appId, status) {
  try {
    const res = await fetch(`${API_BASE}/applications/${appId}/status`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return await res.json();
  } catch (err) {
    console.error("Update application status error:", err);
    return { success: false, message: SERVER_ERROR_MSG };
  }
}

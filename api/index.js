export default function handler(req, res) {
  res.status(200).json({
    message: "Village API Backend",
    status: "running",
    endpoints: ["/api/health", "/api/states", "/api/districts", "/api/subdistricts", "/api/villages"]
  });
}
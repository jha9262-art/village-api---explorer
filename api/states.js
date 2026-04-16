module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const mockStates = [
    { id: 1, state_name: "Andhra Pradesh", code: "AP" },
    { id: 2, state_name: "Arunachal Pradesh", code: "AR" },
    { id: 3, state_name: "Assam", code: "AS" },
    { id: 4, state_name: "Bihar", code: "BR" },
    { id: 5, state_name: "Gujarat", code: "GJ" },
    { id: 6, state_name: "Karnataka", code: "KA" },
    { id: 7, state_name: "Kerala", code: "KL" },
    { id: 8, state_name: "Madhya Pradesh", code: "MP" },
    { id: 9, state_name: "Maharashtra", code: "MH" },
    { id: 10, state_name: "Rajasthan", code: "RJ" },
    { id: 11, state_name: "Tamil Nadu", code: "TN" },
    { id: 12, state_name: "Uttar Pradesh", code: "UP" },
    { id: 13, state_name: "West Bengal", code: "WB" }
  ];

  res.status(200).json({
    success: true,
    data: mockStates,
    count: mockStates.length
  });
}
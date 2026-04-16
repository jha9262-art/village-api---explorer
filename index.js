module.exports = (req, res) => {
  res.status(200).json({
    message: "Hello from Village API",
    success: true
  });
};
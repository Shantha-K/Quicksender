// controllers/rateController.js
// Rate Calculator Controller

exports.calculateRate = (req, res) => {
  try {
    const {
      type, // 'domestic' or 'international'
      country,
      fromCity,
      toCity,
      parcelWeight,
      parcelLength,
      parcelWidth,
      parcelHeight
    } = req.body;

    // Basic validation
    if (!type || !fromCity || !toCity || !parcelWeight || !parcelLength || !parcelWidth || !parcelHeight) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Example rate calculation logic
    let baseRate = type === 'international' ? 20 : 10;
    let weightRate = parseFloat(parcelWeight) * (type === 'international' ? 3 : 2);
    let volume = (parseFloat(parcelLength) * parseFloat(parcelWidth) * parseFloat(parcelHeight)) / 5000; // Volumetric weight
    let volumeRate = volume * (type === 'international' ? 2.5 : 1.5);
    let rate = baseRate + weightRate + volumeRate;
    rate = Math.round(rate * 100) / 100; // Round to 2 decimals

    return res.json({ rate });
  } catch (err) {
    return res.status(500).json({ message: 'Error calculating rate.' });
  }
};

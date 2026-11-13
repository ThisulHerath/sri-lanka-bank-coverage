// Entirely illustrative records near town centres. These are NOT verified branches.
// Replace this module with validated records when the real dataset is available.
export const banks = {
  com: { name: 'Commercial Bank', short: 'COM', color: '#1769dc', tint: '#edf4ff', initials: 'CB' },
  boc: { name: 'Bank of Ceylon', short: 'BOC', color: '#bc8a18', tint: '#fff7e6', initials: 'BOC' },
  pb: { name: 'People’s Bank', short: 'PB', color: '#b74b6a', tint: '#fceef2', initials: 'PB' },
};

const towns = [
  ['Colombo', 'Colombo', 6.9271, 79.8612],
  ['Negombo', 'Gampaha', 7.2083, 79.8358],
  ['Kalutara', 'Kalutara', 6.5854, 79.9607],
  ['Kandy', 'Kandy', 7.2906, 80.6337],
  ['Matale', 'Matale', 7.4675, 80.6234],
  ['Nuwara Eliya', 'Nuwara Eliya', 6.9497, 80.7891],
  ['Galle', 'Galle', 6.0535, 80.2210],
  ['Matara', 'Matara', 5.9549, 80.5550],
  ['Hambantota', 'Hambantota', 6.1429, 81.1212],
  ['Jaffna', 'Jaffna', 9.6615, 80.0255],
  ['Kilinochchi', 'Kilinochchi', 9.3803, 80.3770],
  ['Mannar', 'Mannar', 8.9810, 79.9044],
  ['Vavuniya', 'Vavuniya', 8.7514, 80.4971],
  ['Mullaitivu', 'Mullaitivu', 9.2671, 80.8142],
  ['Batticaloa', 'Batticaloa', 7.7310, 81.6747],
  ['Ampara', 'Ampara', 7.2975, 81.6820],
  ['Trincomalee', 'Trincomalee', 8.5874, 81.2152],
  ['Kurunegala', 'Kurunegala', 7.4863, 80.3647],
  ['Puttalam', 'Puttalam', 8.0362, 79.8283],
  ['Anuradhapura', 'Anuradhapura', 8.3114, 80.4037],
  ['Polonnaruwa', 'Polonnaruwa', 7.9403, 81.0188],
  ['Badulla', 'Badulla', 6.9934, 81.0550],
  ['Monaragala', 'Monaragala', 6.8728, 81.3507],
  ['Ratnapura', 'Ratnapura', 6.7056, 80.3847],
  ['Kegalle', 'Kegalle', 7.2513, 80.3464],
];

const sampleIndices = {
  com: [0, 1, 2, 3, 4, 5, 6, 7, 9, 12, 14, 16, 17, 18, 19, 21, 23, 24],
  boc: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
  pb: [0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 19, 20, 21, 23],
};

export const branches = Object.entries(sampleIndices).flatMap(([bank, indices], bankIndex) =>
  indices.map(index => {
    const [town, district, lat, lng] = towns[index];
    return {
      id: `${bank}-${index}`, bank, name: `${town} · Demo branch`, town, district,
      lat: lat + (bankIndex - 1) * 0.008, lng: lng + (bankIndex - 1) * 0.008,
      status: 'existing', isDemo: true,
    };
  })
);

export const districts = towns.map(town => town[1]).sort();

// Minimal expo mock to prevent winter runtime from loading in tests
module.exports = {
  registerRootComponent: jest.fn(),
};

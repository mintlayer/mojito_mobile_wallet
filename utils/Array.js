const getNRandomElementsFromArray = (array, n) => {
  const result = [];
  const len = array.length;

  if (n > len) {
    throw new RangeError('More elements requested than available');
  }

  for (let i = 0; i < n; i++) {
    const randomIndex = Math.floor(Math.random() * len);
    result.push(array[randomIndex]);
  }

  return result;
};

export { getNRandomElementsFromArray };

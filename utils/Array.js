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

const range = (start, end) => {
  return Array.from(new Array(end - start), (x, i) => i + start);
};

export { getNRandomElementsFromArray, range };

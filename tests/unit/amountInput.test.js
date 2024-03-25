import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AmountInput from '../../components/amoint_input/AmountInput';

const amount = 0.00000012;
const scientificAmount = 1.2e-7;
const expectedAmount = '0.00000012';
const mockFn = jest.fn();

const PROPS_MOCK_01 = {
  amount: amount,
  onChangeText: mockFn,
  onAmountUnitChange: mockFn,
};

const PROPS_MOCK_02 = {
  amount: scientificAmount,
  onChangeText: mockFn,
  onAmountUnitChange: mockFn,
};

test('renders AmountInput', () => {
  render(<AmountInput {...PROPS_MOCK_01} />);
  const textInput = screen.getByPlaceholderText('0');

  expect(textInput.props.value).toBe(expectedAmount);
});

test('renders AmountInput with Scientific Notation value', () => {
  render(<AmountInput {...PROPS_MOCK_02} />);
  const textInput = screen.getByPlaceholderText('0');

  expect(textInput.props.value).toBe(expectedAmount);
});

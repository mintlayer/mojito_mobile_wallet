import React from 'react';
import renderer from 'react-test-renderer';
import AmountInput from '../../components/AmountInput';

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
  const component = renderer.create(<AmountInput {...PROPS_MOCK_01} />);
  const textInput = component.root.findByType('TextInput');

  jest.useFakeTimers();

  expect(textInput.props.value).toBe(expectedAmount);
});

test('renders AmountInput with Scientific Notation value', () => {
  const component = renderer.create(<AmountInput {...PROPS_MOCK_02} />);
  const textInput = component.root.findByType('TextInput');

  jest.useFakeTimers();

  expect(textInput.props.value).toBe(expectedAmount);
});

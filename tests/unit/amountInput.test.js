import React from 'react';
import renderer from 'react-test-renderer';
import AmountInput from '../../components/AmountInput';

const scientificAmount = 1.2e-7;
const expectedAmount = '0.00000012';
const mockFn = jest.fn();

const PROPS_MOCK = {
  amount: scientificAmount,
  onChangeText: mockFn,
  onAmountUnitChange: mockFn,
};

test('renders AmountInput with Scientific Notation value', () => {
  const component = renderer.create(<AmountInput {...PROPS_MOCK} />);
  const textInput = component.root.findByType('TextInput');

  expect(textInput.props.value).toBe(expectedAmount);
});

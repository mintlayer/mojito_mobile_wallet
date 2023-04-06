import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import DrawingBoard from '../../components/DrawingBoard';

jest.useFakeTimers();
const selectedWallet = 'ONCHAIN';
const index = 2;
const walletLabel = 'testing';
const mockFn = jest.fn();

describe('Entrophy drawing', async () => {
  it('drawing screen', async () => {
    // render(<DrawingBoard />);
    console.log('working');
  });
});

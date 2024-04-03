import React, { Component } from 'react';
import PropTypes from 'prop-types';
import BigNumber from 'bignumber.js';
import { Badge, Icon, Text } from 'react-native-elements';
import { Image, LayoutAnimation, Pressable, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import confirm from '../../helpers/confirm';
import loc, { formatBalanceWithoutSuffix, formatBalancePlain, removeTrailingZeros } from '../../loc';
import { BlueText } from '../../BlueComponents';
import dayjs from 'dayjs';
import { MintlayerUnit } from '../../models/mintlayerUnits';
import { ML_ATOMS_PER_COIN } from '../../blue_modules/Mintlayer';
import { getFormattedMlUnitByTestMode } from '../../utils/ML/format';
const currency = require('../../blue_modules/currency');
dayjs.extend(require('dayjs/plugin/localizedFormat'));

class AmountInputML extends Component {
  static propTypes = {
    isLoading: PropTypes.bool,
    amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    onChangeText: PropTypes.func.isRequired,
    onAmountUnitChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    colors: PropTypes.object.isRequired,
    pointerEvents: PropTypes.string,
    unit: PropTypes.string,
    onBlur: PropTypes.func,
    onFocus: PropTypes.func,
    isTestMode: PropTypes.bool,
  };

  /**
   * cache of conversions  fiat amount => coins
   * @type {{}}
   */
  static conversionCache = {};

  static getCachedMlCoins = (amount) => {
    return AmountInputML.conversionCache[amount + MintlayerUnit.LOCAL_CURRENCY] || false;
  };

  static setCachedMlCoins = (amount, coins) => {
    AmountInputML.conversionCache[amount + MintlayerUnit.LOCAL_CURRENCY] = coins;
  };

  constructor() {
    super();
    this.state = { mostRecentFetchedRate: Date(), isRateOutdated: false, isRateBeingUpdated: false };
  }

  componentDidMount() {
    currency
      .mostRecentFetchedRate()
      .then((mostRecentFetchedRate) => {
        this.setState({ mostRecentFetchedRate });
      })
      .finally(() => {
        currency.isRateOutdated().then((isRateOutdated) => this.setState({ isRateOutdated }));
      });
  }

  /**
   * here we must recalculate old amont value (which was denominated in `previousUnit`) to new denomination `newUnit`
   * and fill this value in input box, so user can switch between
   *
   * @param previousUnit {string} one of {MintlayerUnit.*}
   * @param newUnit {string} one of {MintlayerUnit.*}
   */
  onAmountUnitChange(previousUnit, newUnit) {
    const originalAmount = this.props.amount || 0;
    const amount = originalAmount.toString().includes('e') ? BigNumber(originalAmount).toFormat() : originalAmount;
    console.log('was:', amount, previousUnit, '; converting to', newUnit);
    let ml = 0;
    switch (previousUnit) {
      case MintlayerUnit.ML:
      case MintlayerUnit.TML:
        ml = amount * ML_ATOMS_PER_COIN;
        break;
      case MintlayerUnit.LOCAL_CURRENCY:
        ml = new BigNumber(currency.fiatToML(amount * ML_ATOMS_PER_COIN)).toString();
        break;
    }
    if (previousUnit === MintlayerUnit.LOCAL_CURRENCY && AmountInputML.conversionCache[amount + previousUnit]) {
      // cache hit! we reuse old value that supposedly doesnt have rounding errors
      ml = AmountInputML.conversionCache[amount + previousUnit];
    }
    console.log('so, in ml its', ml);

    const newInputValue = formatBalancePlain(ml, newUnit, false);
    console.log('and in', newUnit, 'its', newInputValue);

    this.props.onChangeText(newInputValue);
    this.props.onAmountUnitChange(newUnit);
  }

  /**
   * responsible for cycling currently selected denomination, ML->LOCAL_CURRENCY->ML
   */
  changeAmountUnit = () => {
    let previousUnit = this.props.unit;
    let newUnit;
    if (previousUnit === MintlayerUnit.ML || previousUnit === MintlayerUnit.TML) {
      newUnit = MintlayerUnit.LOCAL_CURRENCY;
    } else if (previousUnit === MintlayerUnit.LOCAL_CURRENCY) {
      newUnit = MintlayerUnit.ML;
    } else {
      newUnit = MintlayerUnit.ML;
      previousUnit = MintlayerUnit.LOCAL_CURRENCY;
    }
    this.onAmountUnitChange(previousUnit, newUnit);
  };

  maxLength = () => {
    switch (this.props.unit) {
      case MintlayerUnit.ML:
      case MintlayerUnit.TML:
        return 12;
      default:
        return 15;
    }
  };

  textInput = React.createRef();

  handleChangeText = (text) => {
    text = text.trim();
    if (this.props.unit !== MintlayerUnit.LOCAL_CURRENCY) {
      text = text.replace(',', '.');
      const split = text.split('.');
      if (split.length >= 2) {
        text = `${parseInt(split[0], 10)}.${split[1]}`;
      } else {
        text = `${parseInt(split[0], 10)}`;
      }

      text = this.props.unit === MintlayerUnit.ML ? text.replace(/[^0-9.]/g, '') : text.replace(/[^0-9]/g, '');

      if (text.startsWith('.')) {
        text = '0.';
      }
    } else if (this.props.unit === MintlayerUnit.LOCAL_CURRENCY) {
      text = text.replace(/,/gi, '.');
      if (text.split('.').length > 2) {
        // too many dots. stupid code to remove all but first dot:
        let rez = '';
        let first = true;
        for (const part of text.split('.')) {
          rez += part;
          if (first) {
            rez += '.';
            first = false;
          }
        }
        text = rez;
      }
      if (text.startsWith('0') && !(text.includes('.') || text.includes(','))) {
        text = text.replace(/^(0+)/g, '');
      }
      text = text.replace(/[^\d.,-]/g, ''); // remove all but numbers, dots & commas
      text = text.replace(/(\..*)\./g, '$1');
    }
    this.props.onChangeText(text);
  };

  resetAmount = async () => {
    if (await confirm(loc.send.reset_amount, loc.send.reset_amount_confirm)) {
      this.props.onChangeText();
    }
  };

  updateRate = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    this.setState({ isRateBeingUpdated: true }, async () => {
      try {
        await currency.updateExchangeRate();
        currency.mostRecentFetchedRate().then((mostRecentFetchedRate) => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          this.setState({ mostRecentFetchedRate });
        });
      } finally {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        this.setState({ isRateBeingUpdated: false, isRateOutdated: await currency.isRateOutdated() });
      }
    });
  };

  render() {
    const { colors, disabled, unit, isTestMode } = this.props;
    const displayUnit = (unit) => getFormattedMlUnitByTestMode(unit, isTestMode);
    const originalAmount = this.props.amount || 0;
    const amount = originalAmount.toString().includes('e') ? BigNumber(originalAmount).toFormat() : originalAmount;
    let secondaryDisplayCurrency = formatBalanceWithoutSuffix(amount, MintlayerUnit.LOCAL_CURRENCY, false);

    let amountInCoins;
    switch (unit) {
      case MintlayerUnit.ML:
      case MintlayerUnit.TML:
        amountInCoins = new BigNumber(amount).multipliedBy(ML_ATOMS_PER_COIN).toString();
        secondaryDisplayCurrency = formatBalanceWithoutSuffix(amountInCoins, MintlayerUnit.LOCAL_CURRENCY, false);
        break;
      case MintlayerUnit.LOCAL_CURRENCY:
        secondaryDisplayCurrency = currency.fiatToML(parseFloat(isNaN(amount) ? 0 : amount));
        break;
    }

    if (amount === MintlayerUnit.MAX) secondaryDisplayCurrency = ''; // we don't want to display NaN

    const stylesHook = StyleSheet.create({
      center: { padding: amount === MintlayerUnit.MAX ? 0 : 15 },
      localCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
      input: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2, fontSize: amount.length > 10 ? 20 : 36 },
      cryptoCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
    });

    return (
      <TouchableWithoutFeedback disabled={this.props.pointerEvents === 'none'} onPress={() => this.textInput.focus()}>
        <>
          <View style={styles.root}>
            {!disabled && <View style={[styles.center, stylesHook.center]} />}
            <View style={styles.flex}>
              <View style={styles.container}>
                {unit === MintlayerUnit.LOCAL_CURRENCY && amount !== MintlayerUnit.MAX && <Text style={[styles.localCurrency, stylesHook.localCurrency]}>{currency.getCurrencySymbol() + ' '}</Text>}
                {amount !== MintlayerUnit.MAX ? (
                  <TextInput
                    {...this.props}
                    testID="MintlayerAmountInput"
                    keyboardType="numeric"
                    adjustsFontSizeToFit
                    onChangeText={this.handleChangeText}
                    onBlur={() => {
                      if (this.props.onBlur) this.props.onBlur();
                    }}
                    onFocus={() => {
                      if (this.props.onFocus) this.props.onFocus();
                    }}
                    placeholder="0"
                    maxLength={this.maxLength()}
                    ref={(textInput) => (this.textInput = textInput)}
                    editable={!this.props.isLoading && !disabled}
                    value={amount === MintlayerUnit.MAX ? loc.units.MAX : parseFloat(amount) >= 0 ? String(amount) : undefined}
                    placeholderTextColor={disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2}
                    style={[styles.input, stylesHook.input]}
                  />
                ) : (
                  <Pressable onPress={this.resetAmount}>
                    <Text style={[styles.input, stylesHook.input]}>{MintlayerUnit.MAX}</Text>
                  </Pressable>
                )}
                {unit !== MintlayerUnit.LOCAL_CURRENCY && amount !== MintlayerUnit.MAX && <Text style={[styles.cryptoCurrency, stylesHook.cryptoCurrency]}>{' ' + loc.units[displayUnit(unit)]}</Text>}
              </View>
              <View style={styles.secondaryRoot}>
                <Text style={styles.secondaryText}>
                  {unit === MintlayerUnit.LOCAL_CURRENCY && amount !== MintlayerUnit.MAX ? removeTrailingZeros(secondaryDisplayCurrency) : secondaryDisplayCurrency}
                  {unit === MintlayerUnit.LOCAL_CURRENCY && amount !== MintlayerUnit.MAX ? ` ${loc.units[displayUnit(MintlayerUnit.ML)]}` : null}
                </Text>
              </View>
            </View>
            {!disabled && amount !== MintlayerUnit.MAX && (
              <TouchableOpacity accessibilityRole="button" testID="changeAmountUnitMintlayer" style={styles.changeAmountUnit} onPress={this.changeAmountUnit}>
                <Image source={require('../../img/round-compare-arrows-24-px.png')} />
              </TouchableOpacity>
            )}
          </View>
          {this.state.isRateOutdated && (
            <View style={styles.outdatedRateContainer}>
              <Badge status="warning" />
              <View style={styles.spacing8} />
              <BlueText>{loc.formatString(loc.send.outdated_rate, { date: dayjs(this.state.mostRecentFetchedRate.LastUpdated).format('l LT') })}</BlueText>
              <View style={styles.spacing8} />
              <TouchableOpacity onPress={this.updateRate} disabled={this.state.isRateBeingUpdated} style={this.state.isRateBeingUpdated ? styles.disabledButton : styles.enabledButon}>
                <Icon name="sync" type="font-awesome-5" size={16} color={colors.buttonAlternativeTextColor} />
              </TouchableOpacity>
            </View>
          )}
        </>
      </TouchableWithoutFeedback>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  center: {
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  spacing8: {
    width: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  enabledButton: {
    opacity: 1,
  },
  outdatedRateContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  container: {
    flexDirection: 'row',
    alignContent: 'space-between',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 2,
  },
  localCurrency: {
    fontSize: 18,
    marginHorizontal: 4,
    fontWeight: 'bold',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  input: {
    fontWeight: 'bold',
  },
  cryptoCurrency: {
    fontSize: 15,
    marginHorizontal: 4,
    fontWeight: '600',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  secondaryRoot: {
    alignItems: 'center',
    marginBottom: 22,
  },
  secondaryText: {
    fontSize: 16,
    color: '#9BA0A9',
    fontWeight: '600',
  },
  changeAmountUnit: {
    alignSelf: 'center',
    marginRight: 16,
    paddingLeft: 16,
    paddingVertical: 16,
  },
});

const AmountInputWithStyle = (props) => {
  const { colors } = useTheme();

  return <AmountInputML {...props} colors={colors} />;
};

// expose static methods
AmountInputWithStyle.conversionCache = AmountInputML.conversionCache;
AmountInputWithStyle.getCachedMlCoins = AmountInputML.getCachedMlCoins;
AmountInputWithStyle.setCachedMlCoins = AmountInputML.setCachedMlCoins;

export default AmountInputWithStyle;

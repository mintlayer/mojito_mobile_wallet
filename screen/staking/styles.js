import { I18nManager } from 'react-native';

export const stakingStyles = {
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  infoDetails: {
    height: '100%',
    padding: 16,
  },
  delegationItem: {
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    paddingVertical: 5,
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  delegationItemInfo: {},
  delegationBalance: {},
  delegationBalanceText: {
    fontSize: 14,
    color: '#000000',
    marginTop: 10,
  },
  delegationPoolId: {},
  delegationPoolIdText: {
    fontSize: 13,
  },
  delegationId: {},
  delegationIdText: {
    fontSize: 18,
  },
  delegationDate: {},
  delegationDateText: {
    fontWeight: 'bold',
  },
  emptyItem: {
    marginHorizontal: 16,
    paddingVertical: 4,
    flex: 1,
  },
  listHeader: {
    marginLeft: 16,
    marginRight: 16,
    marginVertical: 16,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  listHeaderTextRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listHeaderText: {
    marginTop: 8,
    marginBottom: 8,
    fontWeight: 'bold',
    fontSize: 24,
    color: '#000000',
  },

  addButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  listFooter: {
    marginVertical: 46,
    alignItems: 'center',
  },

  addDelegationModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  addDelegationModalContent: {
    padding: 16,
  },
  fee: {
    flexDirection: 'row',
    marginHorizontal: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 14,
  },
  feeRow: {
    minWidth: 40,
    height: 25,
    borderRadius: 4,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },

  createButton: {
    marginVertical: 16,
    alignContent: 'center',
    minHeight: 44,
  },
  balance: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#000000',
  },
  balanceValue: {
    fontSize: 24,
    color: '#000000',
  },

  receiveIcon: {
    transform: [{ rotate: I18nManager.isRTL ? '-225deg' : '225deg' }],
  },
  sendIcon: {
    transform: [{ rotate: I18nManager.isRTL ? '45deg' : '-45deg' }],
  },
};

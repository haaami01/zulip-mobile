/* @flow strict-local */
// $FlowFixMe[untyped-import]
import uniqby from 'lodash.uniqby';

import type {
  MutedUsersState,
  UserPresence,
  User,
  UserId,
  UserGroup,
  PresenceState,
  UserOrBot,
} from '../types';
import { ensureUnreachable } from '../types';
import { statusFromPresence } from '../utils/presence';
import { makeUserId } from '../api/idTypes';

type UsersByStatus = {|
  active: UserOrBot[],
  idle: UserOrBot[],
  offline: UserOrBot[],
  unavailable: UserOrBot[],
|};

export const groupUsersByStatus = (
  users: $ReadOnlyArray<UserOrBot>,
  presences: PresenceState,
): UsersByStatus => {
  const groupedUsers = { active: [], idle: [], offline: [], unavailable: [] };
  users.forEach(user => {
    const status = statusFromPresence(presences[user.email]);
    groupedUsers[status].push(user);
  });
  return groupedUsers;
};

const statusOrder = (presence: UserPresence): number => {
  const status = statusFromPresence(presence);
  switch (status) {
    case 'active':
      return 1;
    case 'idle':
      return 2;
    case 'offline':
      return 3;
    default:
      ensureUnreachable(status);
      return 4;
  }
};

export const sortUserList = (
  users: $ReadOnlyArray<UserOrBot>,
  presences: PresenceState,
): $ReadOnlyArray<UserOrBot> =>
  [...users].sort(
    (x1, x2) =>
      statusOrder(presences[x1.email]) - statusOrder(presences[x2.email])
      || x1.full_name.toLowerCase().localeCompare(x2.full_name.toLowerCase()),
  );

export type AutocompleteOption = $ReadOnly<{
  user_id: UserId,
  email: string,
  full_name: string,
  ...
}>;

export const filterUserList = (
  users: $ReadOnlyArray<UserOrBot>,
  filter: string = '',
  ownUserId: ?UserId,
): $ReadOnlyArray<UserOrBot> =>
  users.filter(
    user =>
      user.user_id !== ownUserId
      && (filter === ''
        || user.full_name.toLowerCase().includes(filter.toLowerCase())
        || user.email.toLowerCase().includes(filter.toLowerCase())),
  );

export const sortAlphabetically = (users: $ReadOnlyArray<User>): $ReadOnlyArray<User> =>
  [...users].sort((x1, x2) => x1.full_name.toLowerCase().localeCompare(x2.full_name.toLowerCase()));

export const filterUserStartWith = (
  users: $ReadOnlyArray<AutocompleteOption>,
  filter: string = '',
  ownUserId: UserId,
): $ReadOnlyArray<AutocompleteOption> =>
  users.filter(
    user =>
      user.user_id !== ownUserId && user.full_name.toLowerCase().startsWith(filter.toLowerCase()),
  );

export const filterUserByInitials = (
  users: $ReadOnlyArray<AutocompleteOption>,
  filter: string = '',
  ownUserId: UserId,
): $ReadOnlyArray<AutocompleteOption> =>
  users.filter(
    user =>
      user.user_id !== ownUserId
      && user.full_name
        .replace(/(\s|[a-z])/g, '')
        .toLowerCase()
        .startsWith(filter.toLowerCase()),
  );

export const filterUserThatContains = (
  users: $ReadOnlyArray<AutocompleteOption>,
  filter: string = '',
  ownUserId: UserId,
): $ReadOnlyArray<AutocompleteOption> =>
  users.filter(
    user =>
      user.user_id !== ownUserId && user.full_name.toLowerCase().includes(filter.toLowerCase()),
  );

export const filterUserMatchesEmail = (
  users: $ReadOnlyArray<AutocompleteOption>,
  filter: string = '',
  ownUserId: UserId,
): $ReadOnlyArray<AutocompleteOption> =>
  users.filter(
    user => user.user_id !== ownUserId && user.email.toLowerCase().includes(filter.toLowerCase()),
  );

export const getUniqueUsers = (
  users: $ReadOnlyArray<AutocompleteOption>,
): $ReadOnlyArray<AutocompleteOption> => uniqby(users, 'email');

export const getUsersAndWildcards = (
  users: $ReadOnlyArray<AutocompleteOption>,
): $ReadOnlyArray<AutocompleteOption> => [
  // TODO stop using makeUserId on these fake "user IDs"; have some
  //   more-explicit UI logic instead of these pseudo-users.
  { user_id: makeUserId(-1), full_name: 'all', email: '(Notify everyone)' },
  { user_id: makeUserId(-2), full_name: 'everyone', email: '(Notify everyone)' },
  ...users,
];

export const getAutocompleteSuggestion = (
  users: $ReadOnlyArray<AutocompleteOption>,
  filter: string = '',
  ownUserId: UserId,
  mutedUsers: MutedUsersState,
): $ReadOnlyArray<AutocompleteOption> => {
  if (users.length === 0) {
    return users;
  }
  const allAutocompleteOptions = getUsersAndWildcards(users);
  const startWith = filterUserStartWith(allAutocompleteOptions, filter, ownUserId);
  const initials = filterUserByInitials(allAutocompleteOptions, filter, ownUserId);
  const contains = filterUserThatContains(allAutocompleteOptions, filter, ownUserId);
  const matchesEmail = filterUserMatchesEmail(users, filter, ownUserId);
  const candidates = getUniqueUsers([...startWith, ...initials, ...contains, ...matchesEmail]);
  return candidates.filter(user => !mutedUsers.has(user.user_id));
};

export const getAutocompleteUserGroupSuggestions = (
  userGroups: $ReadOnlyArray<UserGroup>,
  filter: string = '',
): $ReadOnlyArray<UserGroup> =>
  userGroups.filter(
    userGroup =>
      userGroup.name.toLowerCase().includes(filter.toLowerCase())
      || userGroup.description.toLowerCase().includes(filter.toLowerCase()),
  );

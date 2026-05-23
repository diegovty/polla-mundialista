const GROUPS = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
  B: ['Canada', 'Switzerland', 'Qatar', 'Bosnia-Herzegovina'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['United States', 'Paraguay', 'Australia', 'Türkiye'],
  E: ['Germany', "Côte d'Ivoire", 'Curaçao', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Tunisia', 'Sweden'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Uruguay', 'Saudi Arabia', 'Cabo Verde'],
  I: ['France', 'Senegal', 'Norway', 'Iraq'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'Colombia', 'Uzbekistan', 'Congo DR'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
};

const FLAGS = {
  'Mexico': '🇲🇽', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Czechia': '🇨🇿',
  'Canada': '🇨🇦', 'Switzerland': '🇨🇭', 'Qatar': '🇶🇦', 'Bosnia-Herzegovina': '🇧🇦',
  'Brazil': '🇧🇷', 'Morocco': '🇲🇦', 'Haiti': '🇭🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'United States': '🇺🇸', 'Paraguay': '🇵🇾', 'Australia': '🇦🇺', 'Türkiye': '🇹🇷',
  'Germany': '🇩🇪', "Côte d'Ivoire": '🇨🇮', 'Curaçao': '🇨🇼', 'Ecuador': '🇪🇨',
  'Netherlands': '🇳🇱', 'Japan': '🇯🇵', 'Tunisia': '🇹🇳', 'Sweden': '🇸🇪',
  'Belgium': '🇧🇪', 'Egypt': '🇪🇬', 'Iran': '🇮🇷', 'New Zealand': '🇳🇿',
  'Spain': '🇪🇸', 'Uruguay': '🇺🇾', 'Saudi Arabia': '🇸🇦', 'Cabo Verde': '🇨🇻',
  'France': '🇫🇷', 'Senegal': '🇸🇳', 'Norway': '🇳🇴', 'Iraq': '🇮🇶',
  'Argentina': '🇦🇷', 'Algeria': '🇩🇿', 'Austria': '🇦🇹', 'Jordan': '🇯🇴',
  'Portugal': '🇵🇹', 'Colombia': '🇨🇴', 'Uzbekistan': '🇺🇿', 'Congo DR': '🇨🇩',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croatia': '🇭🇷', 'Ghana': '🇬🇭', 'Panama': '🇵🇦',
};

// Matchday schedule: Matchday 1 = June 11-13, MD2 = June 18-20, MD3 = June 25-27
const MATCHDAY_OFFSETS = { 1: 0, 2: 7, 3: 14 };
const GROUP_LETTERS = Object.keys(GROUPS);

// Group base dates: groups 0-3 → June 11, groups 4-7 → June 12, groups 8-11 → June 13
function getMatchDate(groupIndex, matchday, matchInDay) {
  const baseDay = 11 + Math.floor(groupIndex / 4) + MATCHDAY_OFFSETS[matchday];
  const hour = matchInDay === 0 ? 15 : 19; // 3pm or 7pm UTC (approx)
  return new Date(Date.UTC(2026, 5, baseDay, hour, 0, 0));
}

// Each group: 6 matches across 3 matchdays
// MD1: [0]vs[1], [2]vs[3]
// MD2: [0]vs[2], [1]vs[3]
// MD3: [0]vs[3], [1]vs[2]  (simultaneous)
const MATCHDAY_PAIRS = {
  1: [[0, 1], [2, 3]],
  2: [[0, 2], [1, 3]],
  3: [[0, 3], [1, 2]],
};

function generateFixtures() {
  const fixtures = [];
  let matchNumber = 1;

  GROUP_LETTERS.forEach((groupLetter, groupIndex) => {
    const teams = GROUPS[groupLetter];
    [1, 2, 3].forEach((matchday) => {
      MATCHDAY_PAIRS[matchday].forEach(([i, j], pairIndex) => {
        fixtures.push({
          stage: 'group',
          group_name: groupLetter,
          matchday,
          match_number: matchNumber++,
          team_a: teams[i],
          team_b: teams[j],
          flag_a: FLAGS[teams[i]] || '🏳️',
          flag_b: FLAGS[teams[j]] || '🏳️',
          scheduled_at: getMatchDate(groupIndex, matchday, pairIndex),
          venue: null,
        });
      });
    });
  });

  return fixtures;
}

module.exports = { generateFixtures, FLAGS, GROUPS };

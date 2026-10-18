import {
  courseInventoryNameSimilarity,
  matchAustrianCourseInventory,
  parseAustrianCourseInventoryHtml,
} from './austrian-course-inventory-audit';

describe('Austrian course inventory audit', () => {
  it('parses reviewed directory table rows', () => {
    const html = `
      <table>
        <tr><th>Bld</th><th>Name</th><th>Adresse</th><th>Ort</th><th>Platz</th><th>Tel</th><th>Mail</th><th>Web</th></tr>
        <tr>
          <td>T</td>
          <td>Golfclub Seefeld - Reith</td>
          <td>Reitherspitzstraße 632d</td>
          <td>6100 Seefeld</td>
          <td>9-Loch/Par 35</td>
          <td>+43 5212 3797</td>
          <td>info@example.test</td>
          <td><a href="https://www.gc-seefeld-reith.at/">Web</a></td>
        </tr>
      </table>
    `;

    expect(parseAustrianCourseInventoryHtml(html)).toEqual([
      {
        regionCode: 'T',
        name: 'Golfclub Seefeld - Reith',
        address: 'Reitherspitzstraße 632d',
        postalCode: '6100',
        city: 'Seefeld',
        courseDescription: '9-Loch/Par 35',
        website: 'https://www.gc-seefeld-reith.at/',
      },
    ]);
  });

  it('matches harmless naming variants', () => {
    expect(
      courseInventoryNameSimilarity(
        'Golfclub Kitzbüheler Alpen Westendorf',
        'Golf Club Kitzbüheler Alpen Westendorf',
      ),
    ).toBe(1);
  });

  it('does not merge Seefeld-Reith into Seefeld-Wildmoos', () => {
    const [result] = matchAustrianCourseInventory(
      [
        {
          regionCode: 'T',
          name: 'Golfclub Seefeld - Reith',
          address: 'Reitherspitzstraße 632d',
          postalCode: '6100',
          city: 'Seefeld',
          courseDescription: '9-Loch/Par 35',
          website: 'https://www.gc-seefeld-reith.at/',
        },
      ],
      [
        {
          id: 'wildmoos',
          name: 'Golfclub Seefeld-Wildmoos',
          city: 'Telfs',
        },
      ],
    );

    expect(result.status).toBe('REVIEW');
    expect(result.matchedCourse?.id).toBe('wildmoos');
  });

  it('matches the same facility when name and city agree', () => {
    const [result] = matchAustrianCourseInventory(
      [
        {
          regionCode: 'S',
          name: 'Golfclub Waldhof',
          address: 'Schoberstraße 20',
          postalCode: '5330',
          city: 'Fuschl am See',
          courseDescription: '9-Loch/Par 31',
          website: 'https://www.golfclub-waldhof.at/',
        },
      ],
      [
        {
          id: 'waldhof',
          name: 'Golfclub Waldhof',
          city: 'Fuschl am See',
        },
      ],
    );

    expect(result).toMatchObject({
      status: 'MATCHED',
      nameSimilarity: 1,
      cityMatch: true,
    });
  });
});

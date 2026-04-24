export type Property = {
  id: number
  name: string
  city: string
  zipcode: string
  energysource: string
  units: number
}

export const PROPERTIES: Property[] = [
  { id: 1,  name: 'Property 1',  city: 'Halle',       zipcode: '06110', energysource: 'Erdgas',                 units: 14 },
  { id: 2,  name: 'Property 2',  city: 'Berlin',       zipcode: '10115', energysource: 'Fernwärme',              units: 22 },
  { id: 3,  name: 'Property 3',  city: 'Hamburg',      zipcode: '20095', energysource: 'Wärmepumpe',             units: 31 },
  { id: 4,  name: 'Property 4',  city: 'München',      zipcode: '80331', energysource: 'Heizöl',                 units: 18 },
  { id: 5,  name: 'Property 5',  city: 'Köln',         zipcode: '50667', energysource: 'Erdgas',                 units: 9  },
  { id: 6,  name: 'Property 6',  city: 'Frankfurt',    zipcode: '60311', energysource: 'Fernwärme',              units: 40 },
  { id: 7,  name: 'Property 7',  city: 'Stuttgart',    zipcode: '70173', energysource: 'Pellets',                units: 12 },
  { id: 8,  name: 'Property 8',  city: 'Düsseldorf',   zipcode: '40213', energysource: 'Wärmepumpe',             units: 27 },
  { id: 9,  name: 'Property 9',  city: 'Dortmund',     zipcode: '44135', energysource: 'Erdgas',                 units: 16 },
  { id: 10, name: 'Property 10', city: 'Leipzig',      zipcode: '04109', energysource: 'Fernwärme',              units: 38 },
  { id: 11, name: 'Property 11', city: 'Bremen',       zipcode: '28195', energysource: 'Erdgas',                 units: 21 },
  { id: 12, name: 'Property 12', city: 'Dresden',      zipcode: '01067', energysource: 'Fernwärme',              units: 84 },
  { id: 13, name: 'Property 13', city: 'Hannover',     zipcode: '30159', energysource: 'Wärmepumpe',             units: 11 },
  { id: 14, name: 'Property 14', city: 'Nürnberg',     zipcode: '90402', energysource: 'Heizöl',                 units: 8  },
  { id: 15, name: 'Property 15', city: 'Duisburg',     zipcode: '47051', energysource: 'Erdgas',                 units: 24 },
  { id: 16, name: 'Property 16', city: 'Bochum',       zipcode: '44787', energysource: 'Pellets',                units: 13 },
  { id: 17, name: 'Property 17', city: 'Wuppertal',    zipcode: '42103', energysource: 'Wärmepumpe',             units: 17 },
  { id: 18, name: 'Property 18', city: 'Bielefeld',    zipcode: '33602', energysource: 'Fernwärme',              units: 29 },
  { id: 19, name: 'Property 19', city: 'Bonn',         zipcode: '53111', energysource: 'Erdgas',                 units: 10 },
  { id: 20, name: 'Property 20', city: 'Münster',      zipcode: '48143', energysource: 'Wärmepumpe',             units: 19 },
]

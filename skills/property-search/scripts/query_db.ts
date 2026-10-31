import mysql from "mysql2/promise";

export interface PropertyFilters {
city?: string;
maxPrice?: number;
beds?: number;
baths?: number;
sqft?: number;
type?: string;
pool?: string;
hasView?: string;
}

export interface ListingRow {
L_ListingID: string;
L_DisplayId: string;
L_Address: string;
L_City: string;
L_Zip: string;
price: number;
beds: number;
baths: number;
sqft: number;
type: string;
status: string;
lat: number;
lng: number;
YearBuilt: number;
AssociationFee: number;
DaysOnMarket: number;
PoolPrivateYN: string;
ViewYN: string;
FireplaceYN: string;
PhotoCount: number;
LA1_UserFirstName: string;
LA1_UserLastName: string;
LO1_OrganizationName: string;
}

export interface SoldRow {
ListingKey: string;
UnparsedAddress: string;
City: string;
CloseDate: string;
ClosePrice: number;
OriginalListPrice: number;
ListPrice: number;
DaysOnMarket: number;
BedroomsTotal: number;
BathroomsTotalInteger: number;
LivingArea: number;
PropertyType: string;
PropertySubType: string;
YearBuilt: number;
ListAgentFullName: string;
ListOfficeName: string;
BuyerOfficeName: string;
}

export const pool = mysql.createPool({
host: process.env.MYSQL_HOST,
user: process.env.MYSQL_USER,
password: process.env.MYSQL_PASSWORD,
database: process.env.MYSQL_DATABASE,
waitForConnections: true,
connectionLimit: 10,
queueLimit: 0,
});
export async function query<T>(
  sql: string,
  params: (string | number)[] = []
): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export async function searchActiveListings(filters: PropertyFilters, page = 1,
limit = 10) {
const offset = (page - 1) * limit;
let sql = `
SELECT
L_ListingID, L_DisplayId, L_Address, L_City, L_Zip,
L_SystemPrice AS price, L_Keyword2 AS beds, LM_Dec_3 AS baths,
LM_Int2_3 AS sqft, L_Type_ AS type, L_Status AS status,
LMD_MP_Latitude AS lat, LMD_MP_Longitude AS lng,
YearBuilt, AssociationFee, DaysOnMarket,
PoolPrivateYN, ViewYN, FireplaceYN, PhotoCount,
LA1_UserFirstName, LA1_UserLastName, LO1_OrganizationName
FROM rets_property WHERE L_Status = 'Active'
`;
const params: any[] = [];
if (filters.city) { sql += " AND L_City = ?"; params.push(filters.city); }
if (filters.maxPrice) { sql += " AND L_SystemPrice <= ?"; params.push(filters.maxPrice); }
if (filters.beds) { sql += " AND L_Keyword2 >= ?"; params.push(filters.beds); }
if (filters.baths) { sql += " AND LM_Dec_3 >= ?"; params.push(filters.baths); }
if (filters.sqft) { sql += " AND LM_Int2_3 >= ?"; params.push(filters.sqft); }
if (filters.type) { sql += " AND L_Type_ = ?"; params.push(filters.type); }
if (filters.pool) { sql += " AND PoolPrivateYN = ?"; params.push(filters.pool); }
if (filters.hasView) { sql += " AND ViewYN = ?"; params.push(filters.hasView); }
sql += " ORDER BY L_SystemPrice ASC LIMIT ? OFFSET ?";
params.push(limit, offset);
return query<ListingRow>(sql, params);
}

export async function getSoldComps(city: string, months = 12) {
const sql = `
SELECT
ListingKey, UnparsedAddress, City, CloseDate, ClosePrice,
OriginalListPrice, ListPrice, DaysOnMarket,
BedroomsTotal, BathroomsTotalInteger, LivingArea,
PropertyType, PropertySubType, YearBuilt,
ListAgentFullName, ListOfficeName, BuyerOfficeName
FROM california_sold
WHERE City = ?
AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
AND PropertyType = 'Residential'
ORDER BY CloseDate DESC
LIMIT 50
`;
return query<SoldRow>(sql, [city, months]);
}
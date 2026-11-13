import type { Pool, Connection, RowDataPacket } from "mysql2/promise";

type Database = Pool | Connection;

async function getSalesSummary(db: Database, city: string) {
  const [rows] = await db.execute<RowDataPacket[]>(`
    SELECT
      COUNT(*) AS sold_count,
      ROUND(AVG(ClosePrice), 0) AS avg_close_price,
      ROUND(AVG(ClosePrice / NULLIF(LivingArea, 0)), 0) AS avg_price_per_sqft,
      ROUND(AVG(DaysOnMarket), 1) AS avg_dom,
      ROUND(AVG(ClosePrice / NULLIF(ListPrice, 0)) * 100, 1) AS list_to_close_pct
    FROM california_sold
    WHERE City = ?
      AND PropertyType = 'Residential'
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      AND LivingArea > 0
      AND ClosePrice > 0
  `, [city]);

  return rows[0];
}

async function getMedianPrice(db: Database, city: string) {
  const [rows] = await db.execute<RowDataPacket[]>(`
    SELECT ROUND(AVG(ClosePrice), 0) AS median_close_price
    FROM (
      SELECT ClosePrice,
        ROW_NUMBER() OVER (ORDER BY ClosePrice) AS rn,
        COUNT(*) OVER () AS n
      FROM california_sold
      WHERE City = ?
        AND PropertyType = 'Residential'
        AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        AND LivingArea > 0
        AND ClosePrice > 0
    ) ranked
    WHERE rn IN (FLOOR((n + 1) / 2), FLOOR((n + 2) / 2))
  `, [city]);

  return rows[0].median_close_price;
}

async function getActiveInventory(db: Database, city: string) {
  const [rows] = await db.execute<RowDataPacket[]>(`
    SELECT COUNT(*) AS active_count
    FROM rets_property
    WHERE L_City = ?
      AND L_Status = 'Active'
      AND L_Class = 'Residential'
  `, [city]);

  return Number(rows[0].active_count);
}

async function getYearOverYearChange(db: Database, city: string) {
  const [rows] = await db.execute<RowDataPacket[]>(`
    SELECT
      ROUND(
        (AVG(CASE WHEN CloseDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
          THEN ClosePrice END) /
         NULLIF(AVG(CASE WHEN CloseDate < DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
          THEN ClosePrice END), 0) - 1) * 100, 1
      ) AS yoy_price_change_pct
    FROM california_sold
    WHERE City = ?
      AND PropertyType = 'Residential'
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
      AND LivingArea > 0
      AND ClosePrice > 0
  `, [city]);

  return rows[0].yoy_price_change_pct;
}

export async function getCityMarketSummary(db: Database, city: string) {
  if (!city.trim()) throw new Error("city is required");

  const [summary, median, active, yoy] = await Promise.all([
    getSalesSummary(db, city),
    getMedianPrice(db, city),
    getActiveInventory(db, city),
    getYearOverYearChange(db, city),
  ]);

  const soldCount = Number(summary.sold_count);

  return {
    city,
    ...summary,
    median_close_price: median,
    active_count: active,
    inventory_to_sales_ratio: soldCount
      ? Math.round((active * 12 / soldCount) * 100) / 100
      : null,
    yoy_price_change_pct: yoy,
  };
}

export async function getPriceTrend(
  db: Database,
  city: string,
  months = 24
) {
  if (!city.trim()) throw new Error("city is required");
  if (!Number.isInteger(months) || months < 1)
    throw new Error("months must be a positive integer");

  const [rows] = await db.execute<RowDataPacket[]>(`
    SELECT
      DATE_FORMAT(CloseDate, '%Y-%m') AS month,
      COUNT(*) AS sales,
      ROUND(AVG(ClosePrice), 0) AS avg_price,
      ROUND(AVG(DaysOnMarket), 1) AS avg_dom
    FROM california_sold
    WHERE City = ?
      AND PropertyType = 'Residential'
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    GROUP BY DATE_FORMAT(CloseDate, '%Y-%m')
    ORDER BY month
  `, [city, months]);

  let prev = 0;

  return rows.map(row => {
    const price = Number(row.avg_price || 0);
    const change = prev ? (price / prev - 1) * 100 : null;
    prev = price;

    return {
      month: row.month,
      sales: Number(row.sales),
      avg_price: price || null,
      avg_dom: row.avg_dom == null ? null : Number(row.avg_dom),
      price_change_pct: change,
    };
  });
}

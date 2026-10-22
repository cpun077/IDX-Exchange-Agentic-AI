
export function parsePropertyQuery(query: string) {
    const match = (regex: RegExp) => query.match(regex)?.[1] ?? null;

    const city = match(/\bin ([a-z ]+?)(?=\s+(?:under|below|with|at|for)\b|$)/i);
    const price = query.match(/(?:under|below|no more than)\s+\$?([\d,.]+)\s*(k|m|grand|million)?/i);

    const types: Record<string, string> = {
        condo: "Condominium",
        townhome: "Townhouse",
        "single family": "SingleFamilyResidence",
        house: "SingleFamilyResidence",
        land: "UnimprovedLand"
    };

    const type = Object.keys(types).find(t =>
        query.toLowerCase().includes(t)
    );
    
    const filters = {
        city: city?.trim() ?? null,
        maxPrice: price
            ? Number(price[1].replace(/,/g, "")) *
              (/^(m|million)$/i.test(price[2] ?? "") ? 1e6 :
               /^(k|grand)$/i.test(price[2] ?? "") ? 1e3 : 1)
            : null,
        beds: Number(match(/(\d+(?:\.\d+)?)\s*[\s+-]*bed/i)) || null,
        baths: Number(match(/(\d+(?:\.\d+)?)\s*[\s+-]*bath/i)) || null,
        sqft: Number(match(/([\d,]+)\+?\s*(?:sqft|sq ft|square feet)/i)?.replace(/,/g, "")) || null,
        type: type ? types[type] : null,
        pool: /\bwith (?:a |an )?pool\b/i.test(query) ? "1" : null,
        hasView: /\bwith (?:a |an )?view\b/i.test(query) ? "1" : null
    };

    return {
        status: /\b(exactly|only|preferably|ideally|around|about|between|at least|at most|without|no pool|no view|affordable|cheap)\b/i.test(query)
            ? "needs_interpretation"
            : "complete",
        filters
    };
}

// testing
// const query = "Find homes in Berkeley under $1.5M";
// console.log(JSON.stringify(parsePropertyQuery(query), null, 2));
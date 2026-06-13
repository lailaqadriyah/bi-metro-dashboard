import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  AreaChart,
  Area,
} from "recharts";
import {
  Activity,
  Building2,
  Gauge,
  Globe2,
  MapPin,
  Search,
  TrainFront,
  TrendingUp,
  Sun,
  Moon,
  Loader2,
} from "lucide-react";

const BLUE = [
  "#3b82f6",
  "#60a5fa",
  "#2563eb",
  "#93c5fd",
  "#1d4ed8",
  "#bfdbfe",
];

const numberFormat = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});

function formatRegion(region) {
  return String(region || "unknown")
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function Card({ title, value, subtitle, icon: Icon, accent = "blue" }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </h2>
          {subtitle && (
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-4 shadow-sm ${className}`}
    >
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </h3>
        {subtitle && (
          <p className="truncate text-xs text-slate-400 dark:text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-md dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1.5 font-semibold text-slate-900 dark:text-white">
        {label || payload[0]?.payload?.city}
      </p>
      {payload.map((item, index) => (
        <p key={index} className="text-slate-600 dark:text-slate-300">
          {item.name}:{" "}
          <span className="font-semibold text-slate-900 dark:text-white">
            {numberFormat.format(item.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState([]);
  const [region, setRegion] = useState("all");
  const [country, setCountry] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [regions, setRegions] = useState([]);
  const [topEfficiencyCities, setTopEfficiencyCities] = useState([]);
  const [jakartaRidershipComparison, setJakartaRidershipComparison] = useState([]);
  const [eraCategoryData, setEraCategoryData] = useState([]);
  const [tableLimit, setTableLimit] = useState(15);

  useEffect(() => {
    setTableLimit(15);
  }, [region, country, search]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { data: regionData } = await supabase
        .from("vw_distinct_regions")
        .select("region");
      if (regionData) setRegions(regionData.map((r) => r.region));

      const { data: efficiencyData } = await supabase
        .from("vw_top_efficiency_cities")
        .select("city,country,efficiency");
      if (efficiencyData) {
        setTopEfficiencyCities(
          efficiencyData.map((item) => ({
            ...item,
            efficiency: Number(item.efficiency) || 0,
          })),
        );
      }

      const { data: jakartaData } = await supabase
        .from("vw_jakarta_ridership_comparison")
        .select("city,country,ridership,is_jakarta,rank_no");
      if (jakartaData) {
        setJakartaRidershipComparison(
          jakartaData.map((item) => ({
            city: item.city,
            country: item.country,
            ridership: Number(item.ridership) || 0,
            isJakarta: Boolean(item.is_jakarta),
            rankNo: Number(item.rank_no) || 0,
          })),
        );
      }

      const { data: eraCategoryRows } = await supabase
        .from("vw_era_category_counts")
        .select("era,total");
      if (eraCategoryRows) {
        setEraCategoryData(
          eraCategoryRows.map((item) => ({
            era: item.era,
            total: Number(item.total) || 0,
          })),
        );
      }

      const { data: metroData, error } = await supabase
        .from("vw_metro_full")
        .select("*");

      if (error) {
        console.error("Gagal ambil data:", error);
        setLoading(false);
        return;
      }

      const cleanData = (metroData || [])
        .filter((row) => row.city && row.country)
        .map((row) => ({
          ...row,
          stations: Number(row.stations) || 0,
          length_km: Number(row.length_km) || 0,
          annual_ridership_mill: Number(row.annual_ridership_mill) || 0,
          ridership_per_km: Number(row.ridership_per_km) || 0,
          ridership_per_station: Number(row.ridership_per_station) || 0,
          system_age_years: Number(row.system_age_years) || 0,
          year: Number(row.year) || 0,
        }));
      setData(cleanData);
      setLoading(false);
    }
    fetchData();
  }, []);

  const countries = useMemo(() => {
    const base =
      region === "all" ? data : data.filter((item) => item.region === region);
    return [...new Set(base.map((item) => item.country))].filter(Boolean).sort();
  }, [data, region]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchRegion = region === "all" || item.region === region;
      const matchCountry = country === "all" || item.country === country;
      const query = search.toLowerCase();
      const matchSearch =
        !query ||
        item.city.toLowerCase().includes(query) ||
        item.country.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query);
      return matchRegion && matchCountry && matchSearch;
    });
  }, [data, region, country, search]);

  const stats = useMemo(() => {
    const totalRidership = filteredData.reduce(
      (sum, item) => sum + item.annual_ridership_mill,
      0,
    );
    const totalLength = filteredData.reduce(
      (sum, item) => sum + item.length_km,
      0,
    );
    const totalStations = filteredData.reduce(
      (sum, item) => sum + item.stations,
      0,
    );
    const avgAge = filteredData.length
      ? filteredData.reduce((sum, item) => sum + item.system_age_years, 0) /
        filteredData.length
      : 0;
    return { totalRidership, totalLength, totalStations, avgAge };
  }, [filteredData]);

  const topRidership = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => b.annual_ridership_mill - a.annual_ridership_mill)
      .slice(0, 10)
      .map((item) => ({
        city: item.city,
        ridership: item.annual_ridership_mill,
        country: item.country,
      }));
  }, [filteredData]);

  const topLength = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => b.length_km - a.length_km)
      .slice(0, 10)
      .map((item) => ({
        city: item.city,
        length: item.length_km,
        country: item.country,
      }));
  }, [filteredData]);

  const regionData = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      const key = formatRegion(item.region);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const eraData = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      const decade = Math.floor(item.year / 10) * 10;
      const key = `${decade}s`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([era, total]) => ({
        era,
        total,
        sort: Number(era.replace("s", "")),
      }))
      .sort((a, b) => a.sort - b.sort);
  }, [filteredData]);

  const scatterData = useMemo(() => {
    return filteredData.map((item) => ({
      city: item.city,
      country: item.country,
      length: item.length_km,
      ridership: item.annual_ridership_mill,
      stations: item.stations,
    }));
  }, [filteredData]);

  const bestEfficiency = useMemo(() => {
    return [...filteredData].sort(
      (a, b) => b.ridership_per_km - a.ridership_per_km,
    )[0];
  }, [filteredData]);


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 animate-spin text-blue-500" size={36} />
          <p className="text-base font-medium text-slate-900 dark:text-white">
            Memuat data
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Menyiapkan dashboard metro analytics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
           
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
              Global Metro{" "}
              <span className="text-blue-500">Analytics</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Dashboard analisis sistem metro dunia — jumlah penumpang, panjang
              jalur, stasiun, region, dan usia sistem.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right md:block">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data aktif
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {filteredData.length}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  /{data.length}
                </span>
              </p>
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {/* Filters */}
        <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              size={16}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kota, negara, atau nama metro..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500"
            />
          </div>
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setCountry("all");
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">Semua Region</option>
            {regions.map((item) => (
              <option key={item} value={item}>
                {formatRegion(item)}
              </option>
            ))}
          </select>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">Semua Negara</option>
            {countries.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </section>

        {/* KPI Cards */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card
            title="Total Ridership"
            value={`${numberFormat.format(stats.totalRidership)} jt`}
            subtitle="Akumulasi penumpang tahunan"
            icon={Activity}
          />
          <Card
            title="Total Panjang Jalur"
            value={`${numberFormat.format(stats.totalLength)} km`}
            subtitle="Total panjang jaringan metro"
            icon={MapPin}
          />
          <Card
            title="Total Stasiun"
            value={numberFormat.format(stats.totalStations)}
            subtitle="Akumulasi seluruh stasiun"
            icon={Building2}
          />
          <Card
            title="Rata-rata Usia"
            value={`${numberFormat.format(stats.avgAge)} th`}
            subtitle="Usia rata-rata sistem metro"
            icon={Gauge}
          />
        </section>

        {/* Charts Row 1 */}
        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel title="Top 10 Ridership">
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRidership} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#334155" : "#e2e8f0"}
                    strokeWidth={1}
                  />
                  <XAxis
                    type="number"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="city"
                    type="category"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    tick={{ fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="ridership"
                    name="Ridership (jt)"
                    radius={[0, 4, 4, 0]}
                    fill={BLUE[0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Top 10 Metro Terpanjang">
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topLength}
                  margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#334155" : "#e2e8f0"}
                    strokeWidth={1}
                  />
                  <XAxis
                    dataKey="city"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    tick={{ fontSize: 11 }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                    height={70}
                  />
                  <YAxis
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="length"
                    name="Panjang (km)"
                    radius={[4, 4, 0, 0]}
                    fill={BLUE[1]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        {/* Charts Row 2 */}
        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <Panel title="Hubungan Panjang Jalur vs Ridership">
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 12, right: 12, bottom: 12, left: 4 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "#334155" : "#e2e8f0"}
                      strokeWidth={1}
                    />
                    <XAxis
                      dataKey="length"
                      name="Panjang (km)"
                      stroke={isDark ? "#64748b" : "#94a3b8"}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      dataKey="ridership"
                      name="Ridership (jt)"
                      stroke={isDark ? "#64748b" : "#94a3b8"}
                      tick={{ fontSize: 12 }}
                    />
                    <ZAxis dataKey="stations" range={[30, 200]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={<CustomTooltip />}
                    />
                    <Scatter
                      name="Metro"
                      data={scatterData}
                      fill={BLUE[0]}
                      fillOpacity={0.6}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <Panel title="Distribusi Region">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {regionData.map((_, index) => (
                      <Cell key={index} fill={BLUE[index % BLUE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-1.5">
              {regionData.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-md bg-slate-100/80 px-2.5 py-1.5 text-xs dark:bg-slate-900/50"
                >
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: BLUE[index % BLUE.length],
                      }}
                    />
                    {item.name}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        {/* Power BI Visuals */}
        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel title="Ridership per KM by City">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topEfficiencyCities}
                  layout="vertical"
                  margin={{ left: 24, right: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#334155" : "#e2e8f0"}
                    strokeWidth={1}
                  />
                  <XAxis
                    type="number"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="city"
                    type="category"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    tick={{ fontSize: 11 }}
                    width={78}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="efficiency"
                    name="Ridership per KM"
                    radius={[0, 4, 4, 0]}
                    fill={BLUE[0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Jakarta dalam Ranking Ridership">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={jakartaRidershipComparison}
                  layout="vertical"
                  margin={{ left: 24, right: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#334155" : "#e2e8f0"}
                    strokeWidth={1}
                  />
                  <XAxis
                    type="number"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="city"
                    type="category"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    tick={{ fontSize: 11 }}
                    width={78}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="ridership"
                    name="Ridership (jt)"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                  >
                    {jakartaRidershipComparison.map((item, index) => (
                      <Cell
                        key={`${item.city}-${index}`}
                        fill={item.isJakarta ? "#1d4ed8" : BLUE[1]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Count City by Era">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={eraCategoryData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#334155" : "#e2e8f0"}
                    strokeWidth={1}
                  />
                  <XAxis
                    dataKey="era"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="total"
                    name="Count of City"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  >
                    {eraCategoryData.map((_, index) => (
                      <Cell key={index} fill={BLUE[index % BLUE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        {/* Charts Row 3 */}
        <section className="mb-6 grid grid-cols-1 items-stretch gap-6 xl:grid-cols-4">
          <Panel title="Tren Era Pembangunan" className="h-full xl:col-span-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={eraData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#334155" : "#e2e8f0"}
                    strokeWidth={1}
                  />
                  <XAxis
                    dataKey="era"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    dataKey="total"
                    name="Jumlah Metro"
                    fill={BLUE[2]}
                    stroke={BLUE[0]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="xl:col-span-2">
            <Panel title="Insight Otomatis" className="h-full">
              <div className="grid h-[300px] grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex h-full flex-col justify-center rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <TrendingUp size={16} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ridership tertinggi
                  </p>
                  <h4 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                    {topRidership[0]?.city || "-"}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {numberFormat.format(topRidership[0]?.ridership || 0)} juta
                    penumpang/tahun
                  </p>
                </div>
                <div className="flex h-full flex-col justify-center rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <Globe2 size={16} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Region terbanyak
                  </p>
                  <h4 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                    {[...regionData].sort((a, b) => b.value - a.value)[0]
                      ?.name || "-"}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Metro terbanyak pada filter aktif
                  </p>
                </div>
                <div className="flex h-full flex-col justify-center rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <Gauge size={16} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Efisiensi tertinggi
                  </p>
                  <h4 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                    {bestEfficiency?.city || "-"}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {numberFormat.format(
                      bestEfficiency?.ridership_per_km || 0,
                    )}{" "}
                    juta/km
                  </p>
                </div>
              </div>
            </Panel>
          </div>
        </section>

        {/* Data Table */}
        <Panel title="Tabel Data Metro">
          <div className="-mx-4 overflow-auto">
            <div className="min-w-[900px] px-4">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="pb-3 pr-4">Kota</th>
                    <th className="pb-3 pr-4">Negara</th>
                    <th className="pb-3 pr-4">Nama Metro</th>
                    <th className="pb-3 pr-4">Region</th>
                    <th className="pb-3 pr-4 text-right">Tahun</th>
                    <th className="pb-3 pr-4 text-right">Stasiun</th>
                    <th className="pb-3 pr-4 text-right">Panjang</th>
                    <th className="pb-3 text-right">Ridership</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredData.slice(0, tableLimit).map((item, index) => (
                    <tr
                      key={`${item.city}-${index}`}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                        {item.city}
                      </td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                        {item.country}
                      </td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                        {item.name}
                      </td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                        {formatRegion(item.region)}
                      </td>
                      <td className="py-3 pr-4 text-right text-slate-600 dark:text-slate-300">
                        {item.year}
                      </td>
                      <td className="py-3 pr-4 text-right text-slate-600 dark:text-slate-300">
                        {numberFormat.format(item.stations)}
                      </td>
                      <td className="py-3 pr-4 text-right text-slate-600 dark:text-slate-300">
                        {numberFormat.format(item.length_km)} km
                      </td>
                      <td className="py-3 text-right text-slate-600 dark:text-slate-300">
                        {numberFormat.format(item.annual_ridership_mill)} jt
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <p>
              Menampilkan {Math.min(tableLimit, filteredData.length)} dari{" "}
              {filteredData.length} hasil
              {filteredData.length !== data.length && (
                <span> (disaring dari {data.length})</span>
              )}
            </p>
            {tableLimit < filteredData.length && (
              <button
                onClick={() => setTableLimit((prev) => prev + 15)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                Tampilkan lebih banyak
              </button>
            )}
          </div>
        </Panel>
      </div>
    </main>
  );
}

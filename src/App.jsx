import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
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
} from "lucide-react";

const COLORS = ["#38bdf8", "#818cf8", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#fb7185", "#22c55e"];

const numberFormat = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});

function formatRegion(region) {
  return String(region || "unknown")
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function Card({ title, value, subtitle, icon: Icon, accent = "from-sky-400 to-blue-600" }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-25 blur-xl`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-300">{title}</p>
          <h2 className="mt-2 text-3xl font-bold text-white">{value}</h2>
          <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className={`rounded-2xl bg-gradient-to-br ${accent} p-3 text-white shadow-lg`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 p-3 text-sm shadow-xl">
      <p className="mb-2 font-semibold text-white">{label || payload[0]?.payload?.city}</p>
      {payload.map((item, index) => (
        <p key={index} className="text-slate-300">
          {item.name}: <span className="font-semibold text-white">{numberFormat.format(item.value)}</span>
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

  useEffect(() => {
    Papa.parse("/metro_countries_cities_clean.csv", {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (result) => {
        const cleanData = result.data
          .filter((row) => row.city && row.country)
          .map((row) => ({
            ...row,
            stations: toNumber(row.stations),
            length_km: toNumber(row.length_km),
            annual_ridership_mill: toNumber(row.annual_ridership_mill),
            ridership_per_km: toNumber(row.ridership_per_km),
            ridership_per_station: toNumber(row.ridership_per_station),
            system_age_years: toNumber(row.system_age_years),
            year: toNumber(row.year),
          }));
        setData(cleanData);
        setLoading(false);
      },
    });
  }, []);

  const regions = useMemo(() => [...new Set(data.map((item) => item.region))].filter(Boolean).sort(), [data]);
  const countries = useMemo(() => {
    const base = region === "all" ? data : data.filter((item) => item.region === region);
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
    const totalRidership = filteredData.reduce((sum, item) => sum + item.annual_ridership_mill, 0);
    const totalLength = filteredData.reduce((sum, item) => sum + item.length_km, 0);
    const totalStations = filteredData.reduce((sum, item) => sum + item.stations, 0);
    const avgAge = filteredData.length
      ? filteredData.reduce((sum, item) => sum + item.system_age_years, 0) / filteredData.length
      : 0;
    return { totalRidership, totalLength, totalStations, avgAge };
  }, [filteredData]);

  const topRidership = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => b.annual_ridership_mill - a.annual_ridership_mill)
      .slice(0, 10)
      .map((item) => ({ city: item.city, ridership: item.annual_ridership_mill, country: item.country }));
  }, [filteredData]);

  const topLength = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => b.length_km - a.length_km)
      .slice(0, 10)
      .map((item) => ({ city: item.city, length: item.length_km, country: item.country }));
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
      .map(([era, total]) => ({ era, total, sort: Number(era.replace("s", "")) }))
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
    return [...filteredData].sort((a, b) => b.ridership_per_km - a.ridership_per_km)[0];
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <TrainFront className="mx-auto mb-4 animate-pulse text-sky-400" size={48} />
          <p className="text-lg font-semibold">Memuat dataset metro...</p>
          <p className="text-sm text-slate-400">Membaca CSV dan menyiapkan dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#1d4ed8_0,#020617_38%,#020617_100%)] p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm text-sky-200">
                <TrainFront size={16} /> Business Intelligence Dashboard
              </div>
              <h1 className="text-4xl font-black tracking-tight md:text-6xl">
                Global Metro <span className="text-sky-300">Analytics</span>
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                Dashboard analisis sistem metro dunia berdasarkan jumlah penumpang, panjang jalur, stasiun, region, dan usia sistem.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
              <p className="text-sm text-slate-400">Total data aktif</p>
              <p className="mt-2 text-5xl font-black text-white">{filteredData.length}</p>
              <p className="mt-1 text-sm text-slate-400">dari {data.length} sistem metro</p>
            </div>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-4 rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kota, negara, atau nama metro..."
              className="w-full rounded-2xl border border-white/10 bg-slate-950/50 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
            />
          </div>
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setCountry("all");
            }}
            className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
          >
            <option value="all">Semua Region</option>
            {regions.map((item) => (
              <option key={item} value={item}>{formatRegion(item)}</option>
            ))}
          </select>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
          >
            <option value="all">Semua Negara</option>
            {countries.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Card title="Total Ridership" value={`${numberFormat.format(stats.totalRidership)} jt`} subtitle="Akumulasi penumpang tahunan" icon={Activity} accent="from-sky-400 to-blue-600" />
          <Card title="Total Panjang Jalur" value={`${numberFormat.format(stats.totalLength)} km`} subtitle="Total panjang jaringan metro" icon={MapPin} accent="from-emerald-400 to-teal-600" />
          <Card title="Total Stasiun" value={numberFormat.format(stats.totalStations)} subtitle="Akumulasi seluruh stasiun" icon={Building2} accent="from-violet-400 to-purple-600" />
          <Card title="Rata-rata Usia" value={`${numberFormat.format(stats.avgAge)} th`} subtitle="Usia rata-rata sistem metro" icon={Gauge} accent="from-amber-400 to-orange-600" />
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel title="Top 10 Kota Berdasarkan Ridership" subtitle="Kota dengan penumpang tahunan terbanyak dalam satuan juta.">
            <div className="h-[370px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRidership} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis dataKey="city" type="category" stroke="#94a3b8" width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ridership" name="Ridership" radius={[0, 12, 12, 0]} fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Top 10 Metro Terpanjang" subtitle="Perbandingan kota dengan jaringan metro paling panjang.">
            <div className="h-[370px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topLength} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="city" stroke="#94a3b8" angle={-35} textAnchor="end" interval={0} height={80} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="length" name="Length KM" radius={[12, 12, 0, 0]} fill="#34d399" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <Panel title="Hubungan Panjang Jalur dan Ridership" subtitle="Scatter plot untuk melihat apakah jalur panjang selalu menghasilkan penumpang tinggi.">
              <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="length" name="Length KM" stroke="#94a3b8" />
                    <YAxis dataKey="ridership" name="Ridership" stroke="#94a3b8" />
                    <ZAxis dataKey="stations" range={[40, 280]} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<CustomTooltip />} />
                    <Scatter name="Metro" data={scatterData} fill="#818cf8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <Panel title="Distribusi Region" subtitle="Jumlah sistem metro berdasarkan region.">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={regionData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105} paddingAngle={3}>
                    {regionData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {regionData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl bg-slate-950/40 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {item.name}
                  </span>
                  <span className="font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel title="Tren Era Pembangunan" subtitle="Jumlah metro berdasarkan dekade pembukaan." >
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={eraData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="era" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area dataKey="total" name="Jumlah Metro" fill="#38bdf8" stroke="#38bdf8" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="xl:col-span-2">
            <Panel title="Insight Otomatis" subtitle="Ringkasan temuan utama dari data yang sedang difilter.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-sky-400/20 bg-sky-400/10 p-5">
                  <TrendingUp className="mb-4 text-sky-300" />
                  <p className="text-sm text-slate-300">Ridership tertinggi</p>
                  <h4 className="mt-2 text-xl font-bold text-white">{topRidership[0]?.city || "-"}</h4>
                  <p className="mt-2 text-sm text-slate-400">{numberFormat.format(topRidership[0]?.ridership || 0)} juta penumpang/tahun</p>
                </div>
                <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                  <Globe2 className="mb-4 text-emerald-300" />
                  <p className="text-sm text-slate-300">Region terbanyak</p>
                  <h4 className="mt-2 text-xl font-bold text-white">{[...regionData].sort((a, b) => b.value - a.value)[0]?.name || "-"}</h4>
                  <p className="mt-2 text-sm text-slate-400">Memiliki sistem metro paling banyak pada filter aktif</p>
                </div>
                <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-5">
                  <Gauge className="mb-4 text-violet-300" />
                  <p className="text-sm text-slate-300">Efisiensi tertinggi</p>
                  <h4 className="mt-2 text-xl font-bold text-white">{bestEfficiency?.city || "-"}</h4>
                  <p className="mt-2 text-sm text-slate-400">{numberFormat.format(bestEfficiency?.ridership_per_km || 0)} juta/km</p>
                </div>
              </div>
            </Panel>
          </div>
        </section>

        <Panel title="Tabel Data Metro" subtitle="Data detail yang digunakan dalam dashboard.">
          <div className="max-h-[480px] overflow-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-950 text-slate-300">
                <tr>
                  <th className="p-4">Kota</th>
                  <th className="p-4">Negara</th>
                  <th className="p-4">Nama Metro</th>
                  <th className="p-4">Region</th>
                  <th className="p-4 text-right">Tahun</th>
                  <th className="p-4 text-right">Stasiun</th>
                  <th className="p-4 text-right">Panjang</th>
                  <th className="p-4 text-right">Ridership</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredData.slice(0, 80).map((item, index) => (
                  <tr key={`${item.city}-${index}`} className="bg-slate-950/30 hover:bg-white/10">
                    <td className="p-4 font-semibold text-white">{item.city}</td>
                    <td className="p-4 text-slate-300">{item.country}</td>
                    <td className="p-4 text-slate-300">{item.name}</td>
                    <td className="p-4 text-slate-300">{formatRegion(item.region)}</td>
                    <td className="p-4 text-right text-slate-300">{item.year}</td>
                    <td className="p-4 text-right text-slate-300">{numberFormat.format(item.stations)}</td>
                    <td className="p-4 text-right text-slate-300">{numberFormat.format(item.length_km)} km</td>
                    <td className="p-4 text-right text-slate-300">{numberFormat.format(item.annual_ridership_mill)} jt</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">Menampilkan maksimal 80 baris pertama dari hasil filter agar halaman tetap ringan.</p>
        </Panel>
      </div>
    </main>
  );
}

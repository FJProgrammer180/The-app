/**
 * Minimal PostgREST-compatible fixture server.
 *
 * Purpose: verify the application's *client* behaviour (query strings, filters,
 * rendering of database rows) when a real Supabase project is unreachable from
 * the machine running the checks. It is a test fixture only — it is never
 * imported by application code and never used to fake production behaviour.
 *
 *   node tests/support/mock-postgrest.mjs 54321
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 npm run dev
 *
 * Implemented subset: select, eq, neq, lte, gt, or=(ilike,ilike), contains,
 * overlaps, order, limit, offset (range), count=exact via Content-Range.
 */
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 54321);

const now = Date.now();
const iso = (daysAgo) => new Date(now - daysAgo * 86_400_000).toISOString();

const posts = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Designing a damped 3D hero with React Three Fiber",
    slug: "damped-3d-hero-react-three-fiber",
    excerpt:
      "A pointer-reactive artifact that feels physical: damped rotation, a procedural environment and a render loop that pauses when nobody is looking.",
    content_md: [
      "The hero object is the first thing a visitor interacts with, so it has to feel considered rather than decorative.",
      "",
      "## 1. Damped motion, not pointer mirroring",
      "",
      "Mapping the cursor straight onto rotation reads as jittery. Instead the target angle is derived from R3F's normalised pointer and the mesh eases toward it every frame:",
      "",
      "```ts",
      "node.rotation.y = THREE.MathUtils.damp(node.rotation.y, pointer.x * 0.32, 4, delta);",
      "```",
      "",
      "> React renders the scene, the render loop animates it.",
      "",
      "## 2. Reflection without a download",
      "",
      "Drei's `Environment` renders a scene of `Lightformer` panels into a cube map, so the metal core picks up believable highlights with no HDR file.",
      "",
      "## 3. Falling back deliberately",
      "",
      "| Condition | Treatment |",
      "| --- | --- |",
      "| `prefers-reduced-motion` | Static CSS artifact |",
      "| Save-Data or 2G | Static CSS artifact |",
      "| Viewport under 768 px | Static CSS artifact |",
      "| No WebGL context | Static CSS artifact |",
      "| Otherwise | Interactive canvas, DPR capped at 1.75 |",
    ].join("\n"),
    cover_image_url: null,
    hero_media_url: null,
    tags: ["Three.js", "React Three Fiber", "WebGL", "Design engineering"],
    status: "published",
    published_at: iso(2),
    seo_title: "A damped 3D hero in React Three Fiber",
    seo_description:
      "How the NEXORA hero combines damped pointer motion, a procedural environment and honest fallbacks for reduced motion, small screens and missing WebGL.",
    created_at: iso(3),
    updated_at: iso(2),
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Keeping drafts private with Row Level Security",
    slug: "keeping-drafts-private-row-level-security",
    excerpt:
      "Authorization is a database concern first and a UI concern second. Here is how the NEXORA schema makes unpublished content unreachable rather than merely hidden.",
    content_md: [
      "A draft that is filtered out in JavaScript is still a draft that was sent to the browser.",
      "",
      "## The policy",
      "",
      "```sql",
      'create policy "posts_public_read_published"',
      "  on public.posts for select",
      "  to anon, authenticated",
      "  using (status = 'published' or public.is_admin());",
      "```",
      "",
      "## Server actions are public endpoints",
      "",
      "A server action is an HTTP endpoint. Hiding the delete button changes nothing.",
      "",
      "## Contact messages",
      "",
      "- `insert` is allowed for `anon` with a shape check.",
      "- There is no public `select` policy, so no endpoint can list submissions.",
    ].join("\n"),
    cover_image_url: null,
    hero_media_url: null,
    tags: ["Supabase", "PostgreSQL", "Security", "Row Level Security"],
    status: "published",
    published_at: iso(9),
    seo_title: null,
    seo_description:
      "How Row Level Security makes unpublished content unreachable instead of merely hidden in the interface.",
    created_at: iso(10),
    updated_at: iso(9),
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Notes on building the NEXORA content model",
    slug: "notes-on-the-nexora-content-model",
    excerpt: "Working notes on the schema decisions behind posts, projects, media and settings.",
    content_md: "## Decisions in progress\n\nThis row is a draft and must never be public.",
    cover_image_url: null,
    hero_media_url: null,
    tags: ["PostgreSQL", "Content model"],
    status: "draft",
    published_at: null,
    seo_title: null,
    seo_description: null,
    created_at: iso(1),
    updated_at: iso(1),
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    title: "Scheduled article (published in the future)",
    slug: "scheduled-article",
    excerpt: "A published row whose publication date has not arrived yet.",
    content_md: "## Later\n\nBody.",
    cover_image_url: null,
    hero_media_url: null,
    tags: ["Scheduling"],
    status: "published",
    published_at: new Date(now + 3 * 86_400_000).toISOString(),
    seo_title: null,
    seo_description: null,
    created_at: iso(0),
    updated_at: iso(0),
  },
];

const projects = [
  {
    id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
    title: "NEXORA — cinematic portfolio platform",
    slug: "nexora-cinematic-portfolio",
    summary:
      "A personal portfolio and editorial platform with a procedural 3D hero, a markdown blog and a Supabase-backed admin dashboard.",
    description: [
      "## The brief",
      "",
      "NEXORA needed to be a real product rather than a landing-page shell.",
      "",
      "## Architecture",
      "",
      "- **Next.js App Router** with server components for public content.",
      "- **React Three Fiber** for a procedural hero artifact.",
      "- **Supabase** for PostgreSQL, Auth and Storage.",
      "",
      "## Result",
      "",
      "Publishing, project management, media and contact messages all round-trip through PostgreSQL.",
    ].join("\n"),
    cover_image_url: null,
    technologies: [
      "Next.js",
      "TypeScript",
      "Three.js",
      "React Three Fiber",
      "Supabase",
      "Tailwind CSS",
      "GSAP",
    ],
    demo_url: null,
    repository_url: null,
    is_published: true,
    featured_order: 1,
    created_at: iso(6),
    updated_at: iso(5),
  },
  {
    id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
    title: "Hidden project (must never be public)",
    slug: "hidden-fixture-project",
    summary: "An unpublished row used to prove the public gallery filters on is_published.",
    description: "Hidden.",
    cover_image_url: null,
    technologies: [],
    demo_url: null,
    repository_url: null,
    is_published: false,
    featured_order: 0,
    created_at: iso(5),
    updated_at: iso(5),
  },
];

const settings = [
  { key: "brand", value: { name: "NEXORA", tagline: "A personal digital universe" } },
  {
    key: "home",
    value: {
      eyebrow: "Personal digital universe",
      headline: "Exploring ideas. Engineering possibilities.",
      intro:
        "I build thoughtful software at the intersection of engineering, design and applied AI. NEXORA is where the work, the experiments and the writing live.",
      primary_cta_label: "View projects",
      primary_cta_href: "/projects",
      secondary_cta_label: "Read the blog",
      secondary_cta_href: "/blog",
    },
  },
  {
    key: "about",
    value: {
      display_name: "Site owner",
      role: "Software engineer",
      bio:
        "This biography is editable from the admin dashboard. Sign in as an administrator and open Settings to describe who you are, what you are learning and where you are going.",
      learning: ["Interface engineering", "Applied AI"],
      goals: ["Ship a small, considered body of work"],
      skills: ["TypeScript", "Next.js", "Three.js", "Supabase"],
      timeline: [],
    },
  },
  { key: "social", value: { github: "", x: "", linkedin: "", email: "" } },
  {
    key: "contact",
    value: {
      heading: "Start a conversation",
      intro:
        "Have a project, an idea or a question? Send a message and it will be stored securely for the site owner to read.",
    },
  },
];

const tables = {
  posts,
  projects,
  site_settings: settings,
  contact_messages: [],
  admin_users: [],
};

const COLUMN_ORDER = new Map();
for (const [table, rows] of Object.entries(tables)) {
  if (rows.length > 0) {
    COLUMN_ORDER.set(table, new Set(Object.keys(rows[0])));
  }
}

function project(row, select) {
  if (!select || select === "*") return row;
  const keys = select.split(",").map((entry) => entry.trim()).filter(Boolean);
  const output = {};
  for (const key of keys) {
    if (key in row) output[key] = row[key];
  }
  return output;
}

function compare(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  return a < b ? -1 : 1;
}

function applyFilters(rows, params) {
  let result = [...rows];
  const reserved = new Set(["select", "order", "limit", "offset", "columns", "apikey", "on_conflict"]);

  for (const [key, rawValue] of params.entries()) {
    if (key === "or") {
      const clauses = rawValue
        .replace(/^\(/, "")
        .replace(/\)$/, "")
        .split(",")
        .map((clause) => clause.split("."));
      result = result.filter((row) =>
        clauses.some(([column, op, ...rest]) => {
          if (op !== "ilike" && op !== "like") return false;
          const pattern = rest.join(".").replace(/%/g, "").replace(/\\(.)/g, "$1").toLowerCase();
          return String(row[column] ?? "").toLowerCase().includes(pattern);
        }),
      );
      continue;
    }

    // PostgREST encodes filters as `column=operator.value`.
    const match = /^(eq|neq|lt|lte|gt|gte|like|ilike|cs|ov|not)\.(.*)$/s.exec(rawValue);
    if (!match) continue;
    const operator = match[1];
    const value = match[2];

    if (reserved.has(key)) continue;
    const [column] = key.split(".");
    if (!COLUMN_ORDER.get(currentTable)?.has(column)) continue;

    const list = () => value.replace(/^\{|\}$/g, "").split(",").filter(Boolean);

    switch (operator) {
      case "eq":
        result = result.filter((row) => String(row[column]) === value);
        break;
      case "neq":
        result = result.filter((row) => String(row[column]) !== value);
        break;
      case "lte":
        result = result.filter((row) => row[column] !== null && compare(row[column], value) <= 0);
        break;
      case "gte":
        result = result.filter((row) => compare(row[column], value) >= 0);
        break;
      case "gt":
        result = result.filter((row) => compare(row[column], value) > 0);
        break;
      case "lt":
        result = result.filter((row) => compare(row[column], value) < 0);
        break;
      case "cs": {
        const values = list();
        result = result.filter((row) => values.every((entry) => (row[column] ?? []).includes(entry)));
        break;
      }
      case "ov": {
        const values = list();
        result = result.filter((row) => values.some((entry) => (row[column] ?? []).includes(entry)));
        break;
      }
      default:
        break;
    }
  }

  return result;
}

let currentTable = "";

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const segments = url.pathname.split("/").filter(Boolean);

  // Health endpoint used by tests as a readiness probe.
  if (segments.length === 1 && segments[0] === "health") {
    response.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}');
    return;
  }

  // PostgREST root path: /rest/v1/<table>
  const restIndex = segments.indexOf("v1");
  if (restIndex === -1) {
    response.writeHead(404).end();
    return;
  }

  const table = segments[restIndex + 1];
  if (!table || !tables[table]) {
    response.writeHead(404, { "content-type": "application/json" }).end('{"message":"not found"}');
    return;
  }

  currentTable = table;

  // Writes are rejected here: the fixture only serves reads, which keeps it
  // honest about what it verifies.
  if (request.method !== "GET") {
    response.writeHead(403, { "content-type": "application/json" }).end('{"message":"read-only fixture"}');
    return;
  }

  const params = url.searchParams;
  const select = params.get("select") ?? "*";
  const headOnly = request.headers["prefer"] === "count=exact" && !select;

  let rows = applyFilters(tables[table], params);

  const orderParam = params.get("order");
  if (orderParam) {
    const [column, direction = "asc"] = orderParam.split(".");
    rows.sort((a, b) => (direction === "desc" ? -compare(a[column], b[column]) : compare(a[column], b[column])));
  }

  const total = rows.length;

  const offset = Number(params.get("offset") ?? 0);
  const limit = params.get("limit") ? Number(params.get("limit")) : null;
  if (offset > 0) rows = rows.slice(offset);
  if (limit !== null) rows = rows.slice(0, limit);

  const body = headOnly ? null : JSON.stringify(rows.map((row) => project(row, select)));
  const headers = {
    "content-type": "application/json",
    "content-range": `0-${Math.max(0, rows.length - 1)}/${total}`,
  };

  response.writeHead(200, headers).end(body ?? null);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[mock-postgrest] listening on http://127.0.0.1:${port}`);
});

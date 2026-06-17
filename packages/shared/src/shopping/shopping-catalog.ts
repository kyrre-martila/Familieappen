export const SHOPPING_UNITS = [
  "boks",
  "eske",
  "flaske",
  "glass",
  "kg",
  "l",
  "par",
  "pk",
  "pose",
  "stk",
  "tube",
] as const;

export type ShoppingUnit = (typeof SHOPPING_UNITS)[number];

export interface ShoppingCategory {
  name: string;
  slug: string;
  sortOrder: number;
}

export const SHOPPING_CATEGORIES = [
  {
    name: "Frukt og grønt",
    slug: "frukt-og-gront",
    sortOrder: 10,
  },
  {
    name: "Brød og bakevarer",
    slug: "brod-og-bakevarer",
    sortOrder: 20,
  },
  {
    name: "Meieriprodukter",
    slug: "meieriprodukter",
    sortOrder: 30,
  },
  {
    name: "Kjøtt og fisk",
    slug: "kjott-og-fisk",
    sortOrder: 40,
  },
  {
    name: "Ingredienser og krydder",
    slug: "ingredienser-og-krydder",
    sortOrder: 50,
  },
  {
    name: "Frysevarer og ferdigmåltid",
    slug: "frysevarer-og-ferdigmaltid",
    sortOrder: 60,
  },
  {
    name: "Kornprodukter",
    slug: "kornprodukter",
    sortOrder: 70,
  },
  {
    name: "Snacks og godteri",
    slug: "snacks-og-godteri",
    sortOrder: 80,
  },
  {
    name: "Drikkevarer",
    slug: "drikkevarer",
    sortOrder: 90,
  },
  {
    name: "Husholdning",
    slug: "husholdning",
    sortOrder: 100,
  },
  {
    name: "Omsorg & Helse",
    slug: "omsorg-helse",
    sortOrder: 110,
  },
  {
    name: "Dyreprodukter",
    slug: "dyreprodukter",
    sortOrder: 120,
  },
] as const satisfies readonly ShoppingCategory[];

export type ShoppingCategorySlug = (typeof SHOPPING_CATEGORIES)[number]["slug"];

export interface ShoppingCatalogItem {
  name: string;
  categorySlug: ShoppingCategorySlug;
  aliases: readonly string[];
  defaultUnit: ShoppingUnit;
  suggestedQuantity: number;
}

// TODO(shopping-catalog): Treat this catalog as database seed/source data only.
// Frontend runtime catalog reads should move to DB-backed API endpoints when the
// backend catalog model is introduced.
export const SHOPPING_CATALOG: ShoppingCatalogItem[] = [
{
  name: "Açaí-bær",
  categorySlug: "frukt-og-gront",
  aliases: ["acai", "acaibær"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},
{
  name: "Agurk",
  categorySlug: "frukt-og-gront",
  aliases: ["slangeagurk"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},
{
  name: "Ananas",
  categorySlug: "frukt-og-gront",
  aliases: [],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},
{
  name: "Appelsin",
  categorySlug: "frukt-og-gront",
  aliases: ["appelsiner"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},
{
  name: "Aprikos",
  categorySlug: "frukt-og-gront",
  aliases: ["aprikoser"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},
{
  name: "Artisjokk",
  categorySlug: "frukt-og-gront",
  aliases: [],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},
{
  name: "Asparges",
  categorySlug: "frukt-og-gront",
  aliases: ["aspargesbunter"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},
{
  name: "Aubergine",
  categorySlug: "frukt-og-gront",
  aliases: ["eggplante"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},
{
  name: "Avocado",
  categorySlug: "frukt-og-gront",
  aliases: ["avokado", "avocadoer", "avokadoer"],
  defaultUnit: "stk",
  suggestedQuantity: 2,
},
{
  name: "Bananer",
  categorySlug: "frukt-og-gront",
  aliases: ["banan", "bananer"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Bagel",
  categorySlug: "brod-og-bakevarer",
  aliases: ["bagels"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Baguette",
  categorySlug: "brod-og-bakevarer",
  aliases: ["baguetter"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Boller",
  categorySlug: "brod-og-bakevarer",
  aliases: ["hveteboller", "bolle"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Brød",
  categorySlug: "brod-og-bakevarer",
  aliases: ["loff", "grovbrød", "brød"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Butterdeig",
  categorySlug: "brod-og-bakevarer",
  aliases: ["butterdeigsplater"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Croissant",
  categorySlug: "brod-og-bakevarer",
  aliases: ["croissanter"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Knekkebrød",
  categorySlug: "brod-og-bakevarer",
  aliases: ["knekkebrod"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Muffins",
  categorySlug: "brod-og-bakevarer",
  aliases: ["muffin"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Oppskåret brød",
  categorySlug: "brod-og-bakevarer",
  aliases: ["skivet brød", "oppskåret brød"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Pai",
  categorySlug: "brod-og-bakevarer",
  aliases: ["pie"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Pannekakemiks",
  categorySlug: "brod-og-bakevarer",
  aliases: ["pannekakerøre", "pannekake mix"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Pizzadeig",
  categorySlug: "brod-og-bakevarer",
  aliases: ["pizza dough"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Ristet brød",
  categorySlug: "brod-og-bakevarer",
  aliases: ["toastbrød", "toast"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Smultringer",
  categorySlug: "brod-og-bakevarer",
  aliases: ["donuts", "smultring"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Tortilla",
  categorySlug: "brod-og-bakevarer",
  aliases: ["tortillalefser", "lefser"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Vaffel",
  categorySlug: "brod-og-bakevarer",
  aliases: ["vafler", "vaffelrøre"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Blåmuggost",
  categorySlug: "meieriprodukter",
  aliases: ["blue cheese", "gorgonzola"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Brunost",
  categorySlug: "meieriprodukter",
  aliases: ["geitost"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Cheddar",
  categorySlug: "meieriprodukter",
  aliases: ["cheddarost"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Cottage cheese",
  categorySlug: "meieriprodukter",
  aliases: ["cottagecheese", "hytteost"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Egg",
  categorySlug: "meieriprodukter",
  aliases: ["eggpakke", "høneegg"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Fetaost",
  categorySlug: "meieriprodukter",
  aliases: ["feta"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Fløte",
  categorySlug: "meieriprodukter",
  aliases: ["matfløte", "kremfløte"],
  defaultUnit: "l",
  suggestedQuantity: 1,
},

{
  name: "Grillet ost",
  categorySlug: "meieriprodukter",
  aliases: ["grillost", "halloumi"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Margarin",
  categorySlug: "meieriprodukter",
  aliases: ["brelett"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Mascarpone",
  categorySlug: "meieriprodukter",
  aliases: [],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Melk",
  categorySlug: "meieriprodukter",
  aliases: ["lettmelk", "helmelk", "skummet melk"],
  defaultUnit: "l",
  suggestedQuantity: 1,
},

{
  name: "Mozzarella",
  categorySlug: "meieriprodukter",
  aliases: ["mozzarellaost"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Ost",
  categorySlug: "meieriprodukter",
  aliases: ["gulost", "ostebit"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Parmesan",
  categorySlug: "meieriprodukter",
  aliases: ["parmesanost"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Revet ost",
  categorySlug: "meieriprodukter",
  aliases: ["revet mozzarella", "revet cheddar"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Rømme",
  categorySlug: "meieriprodukter",
  aliases: ["seterrømme", "lettrømme"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Smør",
  categorySlug: "meieriprodukter",
  aliases: ["meierismør"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Smøreost",
  categorySlug: "meieriprodukter",
  aliases: ["kremost"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Soyamelk",
  categorySlug: "meieriprodukter",
  aliases: ["soyamelk usøtet", "plantemelk"],
  defaultUnit: "l",
  suggestedQuantity: 1,
},

{
  name: "Soyayoghurt",
  categorySlug: "meieriprodukter",
  aliases: ["vegansk yoghurt", "planteyoghurt"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Surmelk",
  categorySlug: "meieriprodukter",
  aliases: ["kefir"],
  defaultUnit: "l",
  suggestedQuantity: 1,
},

{
  name: "Yoghurt",
  categorySlug: "meieriprodukter",
  aliases: ["yogurt", "gresk yoghurt"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Ansjos",
  categorySlug: "kjott-og-fisk",
  aliases: ["ansjosfilet"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Bacon",
  categorySlug: "kjott-og-fisk",
  aliases: ["baconskiver"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Biff",
  categorySlug: "kjott-og-fisk",
  aliases: ["biffkjøtt", "entrecôte", "ytrefilet"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Biffstrimler",
  categorySlug: "kjott-og-fisk",
  aliases: ["strimlet biff", "kjøttstrimler"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Blåskjell",
  categorySlug: "kjott-og-fisk",
  aliases: ["blåskjellnett"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Fisk",
  categorySlug: "kjott-og-fisk",
  aliases: ["fersk fisk", "hvit fisk"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Fiskekaker",
  categorySlug: "kjott-og-fisk",
  aliases: ["fiskekake"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Grillpølser",
  categorySlug: "kjott-og-fisk",
  aliases: ["grillpølse", "sommerpølser"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Hamburger",
  categorySlug: "kjott-og-fisk",
  aliases: ["burger", "hamburgerkjøtt"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Hummer",
  categorySlug: "kjott-og-fisk",
  aliases: [],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Kalkun",
  categorySlug: "kjott-og-fisk",
  aliases: ["kalkunkjøtt"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Kalvekjøtt",
  categorySlug: "kjott-og-fisk",
  aliases: ["kalv"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Kaviar",
  categorySlug: "kjott-og-fisk",
  aliases: ["milles kaviar"],
  defaultUnit: "tube",
  suggestedQuantity: 1,
},

{
  name: "Kjøtt",
  categorySlug: "kjott-og-fisk",
  aliases: ["kjøttvarer", "ferskt kjøtt"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Kjøttdeig",
  categorySlug: "kjott-og-fisk",
  aliases: ["deig", "karbonadedeig"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kjøttpølse",
  categorySlug: "kjott-og-fisk",
  aliases: ["kjøttpølser"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kjøttpålegg",
  categorySlug: "kjott-og-fisk",
  aliases: ["pålegg", "kjøttpalegg"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kylling",
  categorySlug: "kjott-og-fisk",
  aliases: ["kyllingfilet", "kyllingkjøtt"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Kyllinglår",
  categorySlug: "kjott-og-fisk",
  aliases: ["drumsticks", "kyllingklubber"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Laks",
  categorySlug: "kjott-og-fisk",
  aliases: ["laksefilet", "fersk laks"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Lammekjøtt",
  categorySlug: "kjott-og-fisk",
  aliases: ["lam", "fårekjøtt"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Pølser",
  categorySlug: "kjott-og-fisk",
  aliases: ["middagspølser", "wienerpølser"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Reker",
  categorySlug: "kjott-og-fisk",
  aliases: ["ferske reker", "pillede reker"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Røkt laks",
  categorySlug: "kjott-og-fisk",
  aliases: ["røkelaks"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Salami",
  categorySlug: "kjott-og-fisk",
  aliases: ["spekesalami"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Skinke",
  categorySlug: "kjott-og-fisk",
  aliases: ["kokt skinke", "påleggsskinke"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Spekekjøtt",
  categorySlug: "kjott-og-fisk",
  aliases: ["fenalår", "spekemat"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Storfekjøtt",
  categorySlug: "kjott-og-fisk",
  aliases: ["oksekjøtt", "storfe"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Svinekjøtt",
  categorySlug: "kjott-og-fisk",
  aliases: ["svin", "grisekjøtt"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Tunfisk",
  categorySlug: "kjott-og-fisk",
  aliases: ["tunfisk på boks"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Viltkjøtt",
  categorySlug: "kjott-og-fisk",
  aliases: ["rein", "elgkjøtt", "hjort"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Østers",
  categorySlug: "kjott-og-fisk",
  aliases: [],
  defaultUnit: "stk",
  suggestedQuantity: 6,
},

{
  name: "Amaranth",
  categorySlug: "ingredienser-og-krydder",
  aliases: [],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Anis",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["aniskrydder"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Bakepulver",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["bake powder"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Balsamico eddik",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["balsamico", "balsamicoeddik"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "BBQ-saus",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["barbecue saus", "bbq sauce"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Bourbon vanilje",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["vanilje", "bourbonvanilje"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Bønner",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["bønnemiks", "beans"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Cashewnøtter",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["cashew"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Chilisaus",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["chili saus", "sweet chili"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Chutney",
  categorySlug: "ingredienser-og-krydder",
  aliases: [],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Dip",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["dipmix", "dipp"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Dressing",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["salatdressing"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Eddik",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["eddikessens"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Eplemos",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["eplemos glass"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Fiskesaus",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["fish sauce"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Gjær",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["ferskgjær", "tørrgjær"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Glasur",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["kakeglasur"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Grønnsaksbuljong",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["buljong", "vegetarbuljong"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Gresskarfrø",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["pumpkin seeds"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Hampfrø",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["hemp seeds"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Hasselnøtter",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["hasselnøtt"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Hel sort pepper",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["pepperkorn", "sort pepper"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Hermetiske tomater",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["tomater på boks", "hermetisk tomat"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Kanel",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["malt kanel"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kapers",
  categorySlug: "ingredienser-og-krydder",
  aliases: [],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Karripasta",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["thai curry paste"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Ketchup",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["tomatketchup"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Kidneybønner",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["kidney beans"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Kjernemelk",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["buttermilk"],
  defaultUnit: "l",
  suggestedQuantity: 1,
},

{
  name: "Kokosmelk",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["coconut milk"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Limeblader",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["kaffir lime leaves", "limeblad"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Linser",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["røde linser", "grønne linser"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Lønnesirup",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["maple syrup"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Maisstivelse",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["maizena", "cornstarch"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Majones",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["mayo"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Malte mandler",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["mandelmel"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Mandelessens",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["almond essence"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Mandler",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["hele mandler"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Marinade",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["grillmarinade"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Matfarger",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["konditorfarge", "matfarge"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Melis",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["sukker melis", "icing sugar"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Muskat",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["muskatnøtt"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Natron",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["baking soda"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Næringsgjær",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["nutritional yeast"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Nøtter",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["nøttemiks", "blandede nøtter"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Olivenolje",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["extra virgin olivenolje"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Olje",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["matolje", "stekeolje"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Oregano",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["tørket oregano"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Paprikapulver",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["paprika krydder"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Pastasaus",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["pastasaus glass", "tomatbasert saus"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Peanøttsmør",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["peanut butter"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Pesto",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["grønn pesto", "rød pesto"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Pinjekjerner",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["pine nuts"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Pistasj",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["pistasjnøtter"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Polenta",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["maisgryn"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Potetmos",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["potetmos pulver"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Romessens",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["rom aroma", "romessens baking"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Rosmarin",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["fersk rosmarin"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Salt",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["bordsalt"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Saus",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["matsaus"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Sennep",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["mustard"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Sjøsalt",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["havsalt"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Solsikkefrø",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["sunflower seeds"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Soyasaus",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["soy sauce"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Strø",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["kakestrø", "strøssel"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Strøkavring",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["griljermel"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Sukker",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["hvitt sukker"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Svart pepper",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["sort pepper"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Sylteagurk",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["pickles"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Tahini",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["sesampasta"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Tamarindpasta",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["tamarind"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Tomatpuré",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["tomatpure"],
  defaultUnit: "tube",
  suggestedQuantity: 1,
},

{
  name: "Tomatsaus",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["pizzasaus", "pastasaus tomat"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Tranebærsaus",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["cranberry sauce"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Trøffel",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["truffle"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Valnøtter",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["valnøtt"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Vaniljesukker",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["vanilje sukker"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Østerssaus",
  categorySlug: "ingredienser-og-krydder",
  aliases: ["oyster sauce"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Burritos",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["frossen burrito"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Dumplings",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["gyoza"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Fiskepinner",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["fish fingers"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Frosne grønnsaker",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["grønnsaksmiks", "fryste grønnsaker"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Hermetiske bønner",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["bønner på boks"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Indisk ferdigmat",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["indisk middag"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Iskrem",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["is", "dessertis"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Italiensk ferdigmat",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["italiensk middag"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kinesisk ferdigmat",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["kinesisk middag"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kyllingvinger",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["wings", "hot wings"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Lasagne",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["frossen lasagne"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Meksikansk ferdigmat",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["meksikansk middag"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Pizza",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["frossen pizza"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Pommes frites",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["fries"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Rømmegrøt",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: [],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Suppe",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["ferdigsuppe"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Taco",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["tacokit"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Thai ferdigmat",
  categorySlug: "frysevarer-og-ferdigmaltid",
  aliases: ["thai middag"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Chiafrø",
  categorySlug: "kornprodukter",
  aliases: ["chia seeds"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Corn Flakes",
  categorySlug: "kornprodukter",
  aliases: ["cornflakes", "frokostblanding mais"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Couscous",
  categorySlug: "kornprodukter",
  aliases: [],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Frokostblanding",
  categorySlug: "kornprodukter",
  aliases: ["cereal", "frokostblanding"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Fusilli",
  categorySlug: "kornprodukter",
  aliases: ["spiralpasta"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Havregryn",
  categorySlug: "kornprodukter",
  aliases: ["havregrøt", "oats"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kikerter",
  categorySlug: "kornprodukter",
  aliases: ["chickpeas"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Mel",
  categorySlug: "kornprodukter",
  aliases: ["hvetemel", "bakemel"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Müsli",
  categorySlug: "kornprodukter",
  aliases: ["musli", "granola"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Nudler",
  categorySlug: "kornprodukter",
  aliases: ["instant noodles"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Pasta",
  categorySlug: "kornprodukter",
  aliases: ["spaghetti", "makaroni"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Pasta penne",
  categorySlug: "kornprodukter",
  aliases: ["penne"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Ris",
  categorySlug: "kornprodukter",
  aliases: ["langkornet ris"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Risnudler",
  categorySlug: "kornprodukter",
  aliases: ["rice noodles"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Rispapir",
  categorySlug: "kornprodukter",
  aliases: ["spring roll papir"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Semulegryn",
  categorySlug: "kornprodukter",
  aliases: ["semolina"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Sjasminris",
  categorySlug: "kornprodukter",
  aliases: ["jasminris", "thai ris"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Speltmel",
  categorySlug: "kornprodukter",
  aliases: ["spelt mel"],
  defaultUnit: "kg",
  suggestedQuantity: 1,
},

{
  name: "Spirulina",
  categorySlug: "kornprodukter",
  aliases: [],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Tempeh",
  categorySlug: "kornprodukter",
  aliases: [],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Tofu",
  categorySlug: "kornprodukter",
  aliases: ["silketofu"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Tortellini",
  categorySlug: "kornprodukter",
  aliases: [],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Cookies",
  categorySlug: "snacks-og-godteri",
  aliases: ["cookies kjeks", "cookies"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Dessert",
  categorySlug: "snacks-og-godteri",
  aliases: ["desserter"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Gelé",
  categorySlug: "snacks-og-godteri",
  aliases: ["gele", "jelly"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Honning",
  categorySlug: "snacks-og-godteri",
  aliases: ["bihonning"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Kake",
  categorySlug: "snacks-og-godteri",
  aliases: ["kaker"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Kjeks",
  categorySlug: "snacks-og-godteri",
  aliases: ["cookies", "biscuits"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Konfekt",
  categorySlug: "snacks-og-godteri",
  aliases: ["sjokoladekonfekt"],
  defaultUnit: "eske",
  suggestedQuantity: 1,
},

{
  name: "Müslibar",
  categorySlug: "snacks-og-godteri",
  aliases: ["muslibar", "energibar"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Nougatkrem",
  categorySlug: "snacks-og-godteri",
  aliases: ["nutella", "sjokoladepålegg"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Panettone",
  categorySlug: "snacks-og-godteri",
  aliases: [],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Peanøtter",
  categorySlug: "snacks-og-godteri",
  aliases: ["peanuts"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Popkorn",
  categorySlug: "snacks-og-godteri",
  aliases: ["popcorn"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Potetgull",
  categorySlug: "snacks-og-godteri",
  aliases: ["chips"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Pudding",
  categorySlug: "snacks-og-godteri",
  aliases: ["dessertpudding"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Saltstenger",
  categorySlug: "snacks-og-godteri",
  aliases: ["pretzels"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Sjokolade",
  categorySlug: "snacks-og-godteri",
  aliases: ["sjokoladeplate"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Snacks",
  categorySlug: "snacks-og-godteri",
  aliases: ["snack", "fredagssnacks"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Snop",
  categorySlug: "snacks-og-godteri",
  aliases: ["godteri"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Sukkertøy",
  categorySlug: "snacks-og-godteri",
  aliases: ["drops", "godteri"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Syltetøy",
  categorySlug: "snacks-og-godteri",
  aliases: ["jordbærsyltetøy", "bringebærsyltetøy"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Tortillachips",
  categorySlug: "snacks-og-godteri",
  aliases: ["nachochips", "nachos"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Tyggegummi",
  categorySlug: "snacks-og-godteri",
  aliases: ["gum"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Tørket frukt",
  categorySlug: "snacks-og-godteri",
  aliases: ["rosiner", "fruktmix tørket"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Vaniljesaus",
  categorySlug: "snacks-og-godteri",
  aliases: ["custard"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Ale",
  categorySlug: "drikkevarer",
  aliases: ["øl ale", "craft ale"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Appelsinjuice",
  categorySlug: "drikkevarer",
  aliases: ["juice appelsin", "oj"],
  defaultUnit: "l",
  suggestedQuantity: 1,
},

{
  name: "Brus",
  categorySlug: "drikkevarer",
  aliases: ["soda", "mineralvann"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Champagne",
  categorySlug: "drikkevarer",
  aliases: ["musserende vin"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Coca Cola",
  categorySlug: "drikkevarer",
  aliases: ["cola", "coke"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Cola light",
  categorySlug: "drikkevarer",
  aliases: ["cola zero", "lightbrus", "coke zero"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Energidrikk",
  categorySlug: "drikkevarer",
  aliases: ["redbull", "monster", "energy drink"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Eplejuice",
  categorySlug: "drikkevarer",
  aliases: ["apple juice"],
  defaultUnit: "l",
  suggestedQuantity: 1,
},

{
  name: "Gin",
  categorySlug: "drikkevarer",
  aliases: [],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Hvitvin",
  categorySlug: "drikkevarer",
  aliases: ["white wine"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Ingefærøl",
  categorySlug: "drikkevarer",
  aliases: ["ginger beer"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Iste",
  categorySlug: "drikkevarer",
  aliases: ["ice tea"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Juice",
  categorySlug: "drikkevarer",
  aliases: ["fruktjuice"],
  defaultUnit: "l",
  suggestedQuantity: 1,
},

{
  name: "Kaffe",
  categorySlug: "drikkevarer",
  aliases: ["filterkaffe", "malt kaffe"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kaffebønner",
  categorySlug: "drikkevarer",
  aliases: ["hele kaffebønner"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kaffekapsler",
  categorySlug: "drikkevarer",
  aliases: ["nespresso kapsler", "kaffekapsel"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kaffeputer",
  categorySlug: "drikkevarer",
  aliases: ["senseo kaffeputer"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kakao",
  categorySlug: "drikkevarer",
  aliases: ["varm sjokolade", "kakaopulver"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Lettbrus",
  categorySlug: "drikkevarer",
  aliases: ["sukkerfri brus", "zero brus"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Mineralvann",
  categorySlug: "drikkevarer",
  aliases: ["farris", "sprudlevann"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Punsj",
  categorySlug: "drikkevarer",
  aliases: ["punch"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Rom",
  categorySlug: "drikkevarer",
  aliases: ["rum"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Rødvin",
  categorySlug: "drikkevarer",
  aliases: ["red wine"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Smoothie",
  categorySlug: "drikkevarer",
  aliases: ["fruktsmoothie"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Sportsdrikk",
  categorySlug: "drikkevarer",
  aliases: ["powerade", "gatorade"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Sprit",
  categorySlug: "drikkevarer",
  aliases: ["brennevin"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Te",
  categorySlug: "drikkevarer",
  aliases: ["teposer"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Tonic",
  categorySlug: "drikkevarer",
  aliases: ["tonic water"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Urtete",
  categorySlug: "drikkevarer",
  aliases: ["herbal tea"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Vann",
  categorySlug: "drikkevarer",
  aliases: ["drikkevann", "flaskevann"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Vodka",
  categorySlug: "drikkevarer",
  aliases: [],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Whisky",
  categorySlug: "drikkevarer",
  aliases: ["whiskey"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Øl",
  categorySlug: "drikkevarer",
  aliases: ["beer"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Aluminiumsfolie",
  categorySlug: "husholdning",
  aliases: ["alu folie", "folie"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Avfallsposer",
  categorySlug: "husholdning",
  aliases: ["søppelposer", "bossposer"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Avkalkningsmiddel",
  categorySlug: "husholdning",
  aliases: ["kalkfjerner"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Avløpsrengjøring",
  categorySlug: "husholdning",
  aliases: ["plumbo", "avløpsrens"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Babymat",
  categorySlug: "husholdning",
  aliases: ["barnemat"],
  defaultUnit: "glass",
  suggestedQuantity: 1,
},

{
  name: "Bakepapir",
  categorySlug: "husholdning",
  aliases: ["bakeark"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Bakepensel",
  categorySlug: "husholdning",
  aliases: ["pensel baking"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Ballong",
  categorySlug: "husholdning",
  aliases: ["ballonger"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Batterier",
  categorySlug: "husholdning",
  aliases: ["aa batteri", "aaa batteri"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Binders",
  categorySlug: "husholdning",
  aliases: ["paper clips"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Blomster",
  categorySlug: "husholdning",
  aliases: ["bukett"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Blomsterjord",
  categorySlug: "husholdning",
  aliases: ["pottejord"],
  defaultUnit: "pose",
  suggestedQuantity: 1,
},

{
  name: "Blyant",
  categorySlug: "husholdning",
  aliases: ["blyanter"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Blyantspisser",
  categorySlug: "husholdning",
  aliases: ["spisser"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Bolle",
  categorySlug: "husholdning",
  aliases: ["serveringsbolle"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Bordbombe",
  categorySlug: "husholdning",
  aliases: ["partybombe"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Caps",
  categorySlug: "husholdning",
  aliases: ["capslue"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Carta",
  categorySlug: "husholdning",
  aliases: ["dopapir carta", "papir carta"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Cocktail paraplyer",
  categorySlug: "husholdning",
  aliases: ["drink paraplyer", "cocktail paraply"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Gave",
  categorySlug: "husholdning",
  aliases: ["presang"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Gavepapir",
  categorySlug: "husholdning",
  aliases: ["innpakningspapir"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Gavesløyfe",
  categorySlug: "husholdning",
  aliases: ["sløyfe gave"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Glassrens",
  categorySlug: "husholdning",
  aliases: ["vindusrens", "vindusvask"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Glitter",
  categorySlug: "husholdning",
  aliases: ["hobbyglitter"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Grill-lighter",
  categorySlug: "husholdning",
  aliases: ["grilltenner", "grill lighter"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Grillklype",
  categorySlug: "husholdning",
  aliases: ["grilltang"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Grillspyd",
  categorySlug: "husholdning",
  aliases: ["grillspyd tre", "spyd"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Gummihansker",
  categorySlug: "husholdning",
  aliases: ["vaskehansker"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Hansker",
  categorySlug: "husholdning",
  aliases: ["arbeidshansker"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Hviskelær",
  categorySlug: "husholdning",
  aliases: ["viskelær"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Juicer",
  categorySlug: "husholdning",
  aliases: ["juicepresse"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Juletrelys",
  categorySlug: "husholdning",
  aliases: ["lys juletre"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Juletrepynt",
  categorySlug: "husholdning",
  aliases: ["julepynt tre"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Konvolutter",
  categorySlug: "husholdning",
  aliases: ["brevkonvolutter"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kostyme",
  categorySlug: "husholdning",
  aliases: ["utkledning"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Kull",
  categorySlug: "husholdning",
  aliases: ["grillkull"],
  defaultUnit: "pose",
  suggestedQuantity: 1,
},

{
  name: "Lighter",
  categorySlug: "husholdning",
  aliases: ["tenner"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Lommelykt",
  categorySlug: "husholdning",
  aliases: ["flashlight"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Lyspærer",
  categorySlug: "husholdning",
  aliases: ["pærer", "led pærer"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Merkepenn",
  categorySlug: "husholdning",
  aliases: ["marker", "tusj"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Møbelpolish",
  categorySlug: "husholdning",
  aliases: ["møbelrens", "polish møbler"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Notisblokk",
  categorySlug: "husholdning",
  aliases: ["notatblokk"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Oppvaskmaskinsalt",
  categorySlug: "husholdning",
  aliases: ["maskinsalt"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Oppvaskmaskintabletter",
  categorySlug: "husholdning",
  aliases: ["oppvasktabletter", "maskintabletter"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Oppvaskmiddel",
  categorySlug: "husholdning",
  aliases: ["zalo", "oppvasksåpe"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Penn",
  categorySlug: "husholdning",
  aliases: ["kulepenn"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Pepperkakeformer",
  categorySlug: "husholdning",
  aliases: ["kakeformer jul"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Pepperkaker",
  categorySlug: "husholdning",
  aliases: ["julekaker"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Plastfolie",
  categorySlug: "husholdning",
  aliases: ["cling film", "matfolie"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Post-it lapper",
  categorySlug: "husholdning",
  aliases: ["post it", "klistrelapper"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Propan",
  categorySlug: "husholdning",
  aliases: ["gassflaske"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Punsj",
  categorySlug: "husholdning",
  aliases: ["hullemaskin", "paper punch"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Reflekser",
  categorySlug: "husholdning",
  aliases: ["refleks"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Rengjøringsmiddel",
  categorySlug: "husholdning",
  aliases: ["rengjøring", "universalspray"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Rengjøringsmiddel bad",
  categorySlug: "husholdning",
  aliases: ["badrens", "bad cleaner"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Servitter",
  categorySlug: "husholdning",
  aliases: ["papirservietter"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Skjerf",
  categorySlug: "husholdning",
  aliases: ["scarf"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Stearinlys",
  categorySlug: "husholdning",
  aliases: ["lys"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Stekespade",
  categorySlug: "husholdning",
  aliases: ["stekespatel"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Støvkoster",
  categorySlug: "husholdning",
  aliases: ["støvkost"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Støvsugerposer",
  categorySlug: "husholdning",
  aliases: ["poser støvsuger"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Svamp",
  categorySlug: "husholdning",
  aliases: ["oppvasksvamp"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Toalettbørste",
  categorySlug: "husholdning",
  aliases: ["toabørste", "wc-børste"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Toner",
  categorySlug: "husholdning",
  aliases: ["printertoner", "blekkpatron"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Tørkepapir",
  categorySlug: "husholdning",
  aliases: ["kjøkkenpapir", "papirhåndkle"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Tøymykner",
  categorySlug: "husholdning",
  aliases: ["skyllemiddel"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Ullsokker",
  categorySlug: "husholdning",
  aliases: ["ullsokk", "raggsokker"],
  defaultUnit: "par",
  suggestedQuantity: 1,
},

{
  name: "Universalrengjøringsmiddel",
  categorySlug: "husholdning",
  aliases: ["universalspray", "allrengjøring"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Vaskekluter",
  categorySlug: "husholdning",
  aliases: ["kluter", "mikrofiberkluter"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Vaskemiddel",
  categorySlug: "husholdning",
  aliases: ["vaskepulver", "tøyvask"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Visp",
  categorySlug: "husholdning",
  aliases: ["kjøkkenvisp"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "WC-rens",
  categorySlug: "husholdning",
  aliases: ["toalettrens", "wc cleaner"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "After sun",
  categorySlug: "omsorg-helse",
  aliases: ["aftersun", "solkrem etter sol"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Aftershave",
  categorySlug: "omsorg-helse",
  aliases: ["barbervann"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Ansiktskrem",
  categorySlug: "omsorg-helse",
  aliases: ["face cream", "dagkrem"],
  defaultUnit: "tube",
  suggestedQuantity: 1,
},

{
  name: "Ansiktsmaling til barna",
  categorySlug: "omsorg-helse",
  aliases: ["ansiktsmaling", "face paint"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Ansiktsmaske",
  categorySlug: "omsorg-helse",
  aliases: ["sheet mask", "hudmaske"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Ansiktsservietter",
  categorySlug: "omsorg-helse",
  aliases: ["våtservietter ansikt"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Antiseptisk krem",
  categorySlug: "omsorg-helse",
  aliases: ["sårkrem", "desinfiserende krem"],
  defaultUnit: "tube",
  suggestedQuantity: 1,
},

{
  name: "Badeolje",
  categorySlug: "omsorg-helse",
  aliases: ["bath oil"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Badesalt",
  categorySlug: "omsorg-helse",
  aliases: ["bath salt"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Balsam",
  categorySlug: "omsorg-helse",
  aliases: ["conditioner"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Bandasjer",
  categorySlug: "omsorg-helse",
  aliases: ["bandasje", "kompress"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Barberblader",
  categorySlug: "omsorg-helse",
  aliases: ["razor blades"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Barberhøvel",
  categorySlug: "omsorg-helse",
  aliases: ["razor"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Barberskum",
  categorySlug: "omsorg-helse",
  aliases: ["shaving foam"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Bind",
  categorySlug: "omsorg-helse",
  aliases: ["sanitetsbind"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Bleier",
  categorySlug: "omsorg-helse",
  aliases: ["babybleier", "pampers"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Bomullspads",
  categorySlug: "omsorg-helse",
  aliases: ["sminkepads", "cotton pads"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Bomullspinner",
  categorySlug: "omsorg-helse",
  aliases: ["q-tips", "cotton buds"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Deodorant",
  categorySlug: "omsorg-helse",
  aliases: ["deo"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Desinfeksjonsspray",
  categorySlug: "omsorg-helse",
  aliases: ["desinfisering", "spray desinfeksjon"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Dopapir",
  categorySlug: "omsorg-helse",
  aliases: ["toalettpapir", "toapapir"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Dusjsåpe",
  categorySlug: "omsorg-helse",
  aliases: ["body wash", "dusjgelé"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Fuktighetskrem",
  categorySlug: "omsorg-helse",
  aliases: ["body lotion", "hudkrem"],
  defaultUnit: "tube",
  suggestedQuantity: 1,
},

{
  name: "Gnagsårplaster",
  categorySlug: "omsorg-helse",
  aliases: ["compeed", "plaster gnagsår"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Halstabletter",
  categorySlug: "omsorg-helse",
  aliases: ["drops hals", "halspastiller"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Håndkrem",
  categorySlug: "omsorg-helse",
  aliases: ["hand cream"],
  defaultUnit: "tube",
  suggestedQuantity: 1,
},

{
  name: "Hårgelé",
  categorySlug: "omsorg-helse",
  aliases: ["gelé hår", "hair gel"],
  defaultUnit: "tube",
  suggestedQuantity: 1,
},

{
  name: "Hårolje",
  categorySlug: "omsorg-helse",
  aliases: ["hair oil"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Hårspray",
  categorySlug: "omsorg-helse",
  aliases: ["hair spray"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Insektsmiddel",
  categorySlug: "omsorg-helse",
  aliases: ["myggspray", "insektsspray"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Kjølegelé",
  categorySlug: "omsorg-helse",
  aliases: ["cooling gel"],
  defaultUnit: "tube",
  suggestedQuantity: 1,
},

{
  name: "Kompresser",
  categorySlug: "omsorg-helse",
  aliases: ["sterile kompresser"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kondomer",
  categorySlug: "omsorg-helse",
  aliases: ["preservativer"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kontaktlinsevæske",
  categorySlug: "omsorg-helse",
  aliases: ["linsevæske"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Leppepomade",
  categorySlug: "omsorg-helse",
  aliases: ["lip balm"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Leppestift",
  categorySlug: "omsorg-helse",
  aliases: ["lipstick"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Medisinsk kull",
  categorySlug: "omsorg-helse",
  aliases: ["aktivt kull"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Munnskyll",
  categorySlug: "omsorg-helse",
  aliases: ["mouthwash"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Muskelkrem",
  categorySlug: "omsorg-helse",
  aliases: ["smertelindrende krem"],
  defaultUnit: "tube",
  suggestedQuantity: 1,
},

{
  name: "Neglefil",
  categorySlug: "omsorg-helse",
  aliases: ["nail file"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Neglelakk",
  categorySlug: "omsorg-helse",
  aliases: ["nail polish"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Neglelakkfjerner",
  categorySlug: "omsorg-helse",
  aliases: ["acetone"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Nesesalve",
  categorySlug: "omsorg-helse",
  aliases: ["nesekrem"],
  defaultUnit: "tube",
  suggestedQuantity: 1,
},

{
  name: "Papirlommetørkle",
  categorySlug: "omsorg-helse",
  aliases: ["kleenex", "lommetørkle"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Parfyme",
  categorySlug: "omsorg-helse",
  aliases: ["perfume"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Peeling",
  categorySlug: "omsorg-helse",
  aliases: ["skrubb", "face scrub"],
  defaultUnit: "tube",
  suggestedQuantity: 1,
},

{
  name: "Pinsetter",
  categorySlug: "omsorg-helse",
  aliases: ["pinsett"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Plaster",
  categorySlug: "omsorg-helse",
  aliases: ["band aid", "plasterstrips"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Pudder",
  categorySlug: "omsorg-helse",
  aliases: ["face powder"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Salve",
  categorySlug: "omsorg-helse",
  aliases: ["hudsalve", "krem"],
  defaultUnit: "tube",
  suggestedQuantity: 1,
},

{
  name: "Shampo",
  categorySlug: "omsorg-helse",
  aliases: ["sjampo", "shampoo"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Skjeggolje",
  categorySlug: "omsorg-helse",
  aliases: ["beard oil"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Smertestillende",
  categorySlug: "omsorg-helse",
  aliases: ["paracet", "ibux", "smertestillende tabletter"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Sminkefjerner",
  categorySlug: "omsorg-helse",
  aliases: ["makeup remover"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Solkrem",
  categorySlug: "omsorg-helse",
  aliases: ["sunblock", "spf"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Såpe",
  categorySlug: "omsorg-helse",
  aliases: ["håndsåpe", "barsåpe"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Tamponger",
  categorySlug: "omsorg-helse",
  aliases: ["tampons"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Tannbørste",
  categorySlug: "omsorg-helse",
  aliases: ["toothbrush"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Tannkrem",
  categorySlug: "omsorg-helse",
  aliases: ["toothpaste"],
  defaultUnit: "tube",
  suggestedQuantity: 1,
},

{
  name: "Tanntråd",
  categorySlug: "omsorg-helse",
  aliases: ["dental floss"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Termometer",
  categorySlug: "omsorg-helse",
  aliases: ["febertermometer"],
  defaultUnit: "stk",
  suggestedQuantity: 1,
},

{
  name: "Tran",
  categorySlug: "omsorg-helse",
  aliases: ["omega 3", "fiskeolje"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Vitaminer",
  categorySlug: "omsorg-helse",
  aliases: ["kosttilskudd", "multivitamin"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Våtservitter",
  categorySlug: "omsorg-helse",
  aliases: ["baby wipes", "wet wipes"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Øyedråper",
  categorySlug: "omsorg-helse",
  aliases: ["øyedråpe"],
  defaultUnit: "flaske",
  suggestedQuantity: 1,
},

{
  name: "Fiskemat",
  categorySlug: "dyreprodukter",
  aliases: ["fiskefôr", "akvariefôr"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Fuglefrø",
  categorySlug: "dyreprodukter",
  aliases: ["fuglfrø", "frøblanding fugl"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Fuglemat",
  categorySlug: "dyreprodukter",
  aliases: ["villfuglmat", "meiseboller"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Hundegodt",
  categorySlug: "dyreprodukter",
  aliases: ["hundesnacks", "godbit hund"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Hundeposer",
  categorySlug: "dyreprodukter",
  aliases: ["bæsjeposer", "hundepose"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Hundetørrfór",
  categorySlug: "dyreprodukter",
  aliases: ["hundemat tørrfôr", "dog food dry", "hundefôr"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Hundevåtfór",
  categorySlug: "dyreprodukter",
  aliases: ["hundemat våtfôr", "dog food wet"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Kattegodt",
  categorySlug: "dyreprodukter",
  aliases: ["kattesnacks", "godbit katt"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kattemat tørrfór",
  categorySlug: "dyreprodukter",
  aliases: ["kattefôr tørr", "cat food dry", "kattemat tørrfôr"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Kattemat våtfór",
  categorySlug: "dyreprodukter",
  aliases: ["kattefôr våt", "cat food wet", "kattemat våtfôr"],
  defaultUnit: "boks",
  suggestedQuantity: 1,
},

{
  name: "Kattesand",
  categorySlug: "dyreprodukter",
  aliases: ["kattegrus"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},

{
  name: "Smådyrmat",
  categorySlug: "dyreprodukter",
  aliases: ["kaninmat", "hamstermat", "marsvinmat"],
  defaultUnit: "pk",
  suggestedQuantity: 1,
},
];

export function getShoppingCategoryBySlug(slug: string): ShoppingCategory | undefined {
  return SHOPPING_CATEGORIES.find((category) => category.slug === slug);
}

export function getShoppingCatalogItemsByCategory(categorySlug: ShoppingCategorySlug): ShoppingCatalogItem[] {
  return SHOPPING_CATALOG.filter((item) => item.categorySlug === categorySlug);
}

export function normalizeShoppingSearchValue(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("nb-NO")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchShoppingCatalog(query: string): ShoppingCatalogItem[] {
  const normalizedQuery = normalizeShoppingSearchValue(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  return SHOPPING_CATALOG.filter((item) => {
    const searchableValues = [item.name, ...item.aliases];

    return searchableValues.some((value) =>
      normalizeShoppingSearchValue(value).includes(normalizedQuery),
    );
  });
}

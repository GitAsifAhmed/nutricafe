/* Nutri Café - shared data: ingredient database, nutrition engine, menu.

   PRIMARY SOURCE: Food Composition Table for Bangladesh (FAO/INFS, University of
   Dhaka, 2013; Shaheen et al.), Excel database FCDB_7_4_14. Values are taken per
   100 g of edible portion; codes such as "FCT 02_0008" point to the exact row.
   Saturated fat comes from the table's fatty-acid annex where measured.
   Foods the table does not cover use USDA FoodData Central (SR Legacy), and a few
   derived values are marked "estimate" with the method stated.

   Conventions (same as the Bangladesh table):
   - "c" is AVAILABLE carbohydrate; dietary fibre is reported separately.
   - Energy uses the table's own kcal values (factors 4/4/9, fibre 2).
   - "sat" saturated fat (g), "na" sodium (mg), "sug" FREE sugars (g, WHO definition:
     sugars added to food plus honey/syrups; not sugars naturally in fruit or milk). */

(function () {
  // unit maps: grams per unit
  const G = { g: 1, kg: 1000 };
  const OIL = { ml: 0.92, tsp: 4.6, tbsp: 13.8, g: 1 };
  const SPICE = { g: 1, tsp: 2.5, tbsp: 7.5 };

  // [id, name, bangla, category, kcal, protein, carbs(avail), fat, fibre, satfat, sodium mg, free sugar, units, flags, source]
  const RAW = [
    // Grains & breads
    ["rice_cooked", "Rice, parboiled, boiled (bhat)", "ভাত", "Grains & breads", 109, 2.1, 24.3, 0.1, 1.1, 0.03, 3, 0, { g: 1, cup: 160 }, 0, "FCT 01_0037 (BR-28, boiled)"],
    ["rice_raw", "Rice, parboiled, raw (chal)", "চাল", "Grains & breads", 344, 6.5, 76.8, 0.4, 3.4, 0.1, 2, 0, { g: 1, kg: 1000, cup: 185 }, 0, "FCT 01_0012 (BR-28)"],
    ["brown_rice_cooked", "Red / brown rice, boiled", "লাল চালের ভাত", "Grains & breads", 112, 2.5, 23.2, 0.8, 1.2, 0.15, 4, 0, { g: 1, cup: 160 }, 0, "FCT 01_0039"],
    ["ruti", "Ruti / chapati", "রুটি", "Grains & breads", 246, 7.5, 49.7, 1.2, 3.1, 0.2, 231, 0, { piece: 40, g: 1 }, 0, "FCT 01_0042"],
    ["paratha", "Paratha (atta + oil, home-style)", "পরোটা", "Grains & breads", 299, 7.1, 38.9, 11.3, 6.7, 1.7, 394, 0, { piece: 80, g: 1 }, 0, "estimate: FCT atta 01_0030 + soybean oil 13_0012 recipe"],
    ["atta", "Whole-wheat flour (atta)", "আটা", "Grains & breads", 334, 11.3, 62.2, 2.1, 10.7, 0.37, 16, 0, { g: 1, cup: 120 }, 0, "FCT 01_0030"],
    ["maida", "White flour (maida)", "ময়দা", "Grains & breads", 346, 9.8, 73.1, 1.0, 2.7, 0.22, 10, 0, { g: 1, cup: 125 }, 0, "FCT 01_0032"],
    ["bread", "White bread (pauruti)", "পাউরুটি", "Grains & breads", 272, 8.0, 55.6, 1.4, 2.5, 0.3, 592, 0, { piece: 25, g: 1 }, 0, "FCT 01_0003"],
    ["chira", "Flattened rice (chira), dry", "চিড়া", "Grains & breads", 356, 6.5, 79.2, 1.1, 1.3, 0.2, 2, 0, { g: 1, cup: 60 }, 0, "FCT 01_0010"],
    ["muri", "Puffed rice (muri), salted", "মুড়ি", "Grains & breads", 361, 6.7, 82.7, 0.1, 1.4, 0, 650, 0, { g: 1, cup: 14 }, 0, "FCT 01_0023"],
    ["oats", "Rolled oats, dry", "ওটস", "Grains & breads", 389, 16.9, 55.7, 6.9, 10.6, 1.2, 2, 0, { g: 1, cup: 80 }, 0, "USDA 173904 (carbs shown as available)"],
    ["noodles_dry", "Instant noodles with seasoning, dry block", "নুডলস", "Grains & breads", 440, 9.0, 60.6, 17.0, 2.4, 7.6, 1160, 0, { piece: 70, g: 1 }, 0, "USDA (varies by brand)"],
    ["pasta_dry", "Pasta, dry", "পাস্তা", "Grains & breads", 371, 13.0, 71.5, 1.5, 3.2, 0.28, 6, 0, { g: 1, cup: 100 }, 0, "USDA 169736"],

    // Pulses & legumes
    ["masoor_dry", "Masoor dal (red lentil), dry", "মসুর ডাল", "Pulses", 317, 27.7, 43.2, 0.8, 13.2, 0.14, 37, 0, { g: 1, cup: 190 }, 0, "FCT 02_0008"],
    ["masoor_cooked", "Masoor dal, boiled & thick (no salt)", "রান্না মসুর ডাল", "Pulses", 155, 13.6, 21.2, 0.4, 6.5, 0.07, 16, 0, { g: 1, cup: 200 }, 0, "FCT 02_0015"],
    ["mung_dry", "Mung dal, split, dry", "মুগ ডাল", "Pulses", 351, 23.7, 60.9, 1.2, 0.7, 0.3, 30, 0, { g: 1, cup: 200 }, 0, "FCT 02_0005"],
    ["mung_cooked", "Mung dal, boiled (no salt)", "রান্না মুগ ডাল", "Pulses", 161, 10.9, 28.1, 0.5, 0.3, 0.14, 13, 0, { g: 1, cup: 200 }, 0, "FCT 02_0013"],
    ["chickpea_boiled", "Chickpeas (chola), boiled", "সিদ্ধ ছোলা", "Pulses", 182, 10.6, 23.3, 3.1, 9.1, 0.33, 16, 0, { g: 1, cup: 164 }, 0, "FCT 02_0012"],
    ["chickpea_dry", "Chickpeas (chola), dry", "ছোলা", "Pulses", 350, 20.4, 44.8, 6.0, 17.4, 0.63, 33, 0, { g: 1, cup: 200 }, 0, "FCT 02_0002"],
    ["besan", "Gram flour (besan / cholar dal)", "বেসন", "Pulses", 375, 20.2, 59.2, 6.0, 1.2, 0.63, 39, 0, { g: 1, tbsp: 8, cup: 92 }, 0, "FCT 02_0001 (split Bengal gram)"],
    ["peas", "Green peas (motorshuti)", "মটরশুটি", "Pulses", 91, 7.0, 12.5, 0.4, 5.1, 0.06, 5, 0, { g: 1, cup: 145 }, 0, "FCT 03_0026"],
    ["soya_chunks", "Soya chunks, dry", "সয়াবিন বড়ি", "Pulses", 345, 52.0, 20.0, 0.5, 13.0, 0.1, 20, 0, { g: 1, cup: 50 }, 0, "USDA (defatted soy)"],

    // Eggs, meat & fish
    ["egg", "Egg, farm (~50 g edible)", "ফার্মের ডিম", "Eggs, meat & fish", 139, 14.5, 0, 9.0, 0, 2.70, 116, 0, { piece: 50, g: 1 }, 0, "FCT 11_0001"],
    ["egg_deshi", "Egg, deshi (~40 g edible)", "দেশি ডিম", "Eggs, meat & fish", 158, 13.3, 0, 11.6, 0, 3.48, 135, 0, { piece: 40, g: 1 }, 0, "FCT 11_0002"],
    ["egg_duck", "Duck egg (~60 g edible)", "হাঁসের ডিম", "Eggs, meat & fish", 188, 13.5, 1.4, 14.3, 0, 3.83, 134, 0, { piece: 60, g: 1 }, 0, "FCT 11_0004"],
    ["chicken_bonein", "Broiler chicken, bone-in curry cut (purchase weight, skin off)", "মুরগি (হাড়সহ)", "Eggs, meat & fish", 87, 15.3, 0, 2.8, 0, 0.81, 34, 0, G, 0, "estimate: FCT 10_0006 & 10_0007 average × 0.74 edible"],
    ["chicken_boneless", "Chicken, boneless & skinless (mixed cuts)", "মুরগি (হাড় ছাড়া)", "Eggs, meat & fish", 117, 20.7, 0, 3.8, 0, 1.09, 46, 0, G, 0, "FCT 10_0006 & 10_0007 average"],
    ["chicken_breast", "Chicken breast, skinless", "মুরগির বুকের মাংস", "Eggs, meat & fish", 106, 22.3, 0, 1.8, 0, 0.53, 37, 0, G, 0, "FCT 10_0006"],
    ["beef", "Beef, curry cut with some fat, boneless", "গরুর মাংস", "Eggs, meat & fish", 207, 19.7, 0, 14.2, 0, 5.6, 69, 0, G, 0, "FCT 10_0003 (sat fat: USDA ratio)"],
    ["beef_lean", "Beef, lean, boneless", "গরুর মাংস (চর্বি ছাড়া)", "Eggs, meat & fish", 103, 20.7, 0, 2.3, 0, 0.94, 52, 0, G, 0, "FCT 10_0002"],
    ["mutton", "Goat meat (khashi), lean", "খাসির মাংস", "Eggs, meat & fish", 118, 21.4, 0, 3.6, 0, 1.1, 82, 0, G, 0, "FCT 10_0011 (sat fat: USDA ratio)"],
    ["rohu_steak", "Rohu fish steak, bone-in (purchase weight)", "রুই মাছ (কাঁটাসহ)", "Eggs, meat & fish", 89, 17.5, 0, 2.2, 0, 0.75, 33, 0, G, 0, "estimate: FCT 09_0060 × 0.85 edible"],
    ["rohu", "Rohu fish, boneless", "রুই মাছ", "Eggs, meat & fish", 105, 20.6, 0, 2.6, 0, 0.88, 38, 0, G, 0, "FCT 09_0060"],
    ["hilsa", "Hilsa (ilish), boneless", "ইলিশ", "Eggs, meat & fish", 223, 18.0, 0, 16.8, 0, 5.5, 52, 0, G, 0, "FCT 09_0033 (sat fat estimate: ~33% of fat)"],
    ["pangas", "Pangas, boneless", "পাঙ্গাস", "Eggs, meat & fish", 162, 15.9, 0, 11.0, 0, 4.05, 46, 0, G, 0, "FCT 09_0047"],
    ["tilapia", "Tilapia, boneless", "তেলাপিয়া", "Eggs, meat & fish", 110, 20.8, 0, 3.0, 0, 1.08, 55, 0, G, 0, "FCT 09_0068"],
    ["shrimp", "Prawn (golda chingri), raw", "গলদা চিংড়ি", "Eggs, meat & fish", 102, 20.9, 0, 2.0, 0, 0.4, 116, 0, G, 0, "FCT 09_0054"],

    // Dairy
    ["milk", "Milk, cow, whole", "দুধ", "Dairy", 63, 3.1, 4.3, 3.7, 0, 1.94, 51, 0, { ml: 1.03, cup: 250, g: 1 }, 0, "FCT 12_0008"],
    ["doi", "Yoghurt, plain (tok doi)", "টক দই", "Dairy", 61, 3.5, 4.7, 3.3, 0, 2.1, 46, 0, { g: 1, tbsp: 15, cup: 245 }, 0, "USDA 171284 (plain doi not in FCT)"],
    ["mishti_doi", "Sweet yoghurt (mishti doi)", "মিষ্টি দই", "Dairy", 94, 3.2, 11.4, 4.0, 0, 2.5, 51, 7.0, { g: 1, cup: 245 }, 0, "FCT 12_0003 (free sugar: estimate)"],
    ["paneer", "Paneer / chhana", "পনির / ছানা", "Dairy", 346, 24.6, 5.4, 25.1, 0, 15.8, 509, 0, { g: 1 }, 0, "FCT 12_0002 (sat fat: USDA ratio)"],
    ["cheese", "Cheese, cheddar-type", "চিজ", "Dairy", 403, 24.9, 1.3, 33.1, 0, 18.9, 621, 0, { piece: 20, g: 1 }, 0, "USDA 173414"],
    ["condensed_milk", "Condensed milk, sweetened", "কনডেন্সড মিল্ক", "Dairy", 334, 8.2, 54.0, 9.4, 0, 5.9, 134, 42, { g: 1, tbsp: 20 }, 0, "FCT 12_0009 (free sugar: estimate)"],

    // Vegetables & herbs
    ["mixed_veg", "Mixed seasonal vegetables", "মিশ্র সবজি", "Vegetables & herbs", 28, 1.8, 3.1, 0.2, 2.9, 0.04, 19, 0, G, 0, "average of 8 FCT vegetables (pumpkin, carrot, cabbage, cauliflower, brinjal, potol, green papaya, borboti)"],
    ["potato", "Potato", "আলু", "Vegetables & herbs", 66, 1.2, 14.0, 0.2, 2.1, 0.03, 16, 0, { g: 1, piece: 150 }, 0, "FCT 05_0005"],
    ["onion", "Onion", "পেঁয়াজ", "Vegetables & herbs", 59, 1.4, 12.2, 0.1, 1.9, 0.01, 11, 0, { g: 1, piece: 100 }, 0, "FCT 03_0024"],
    ["garlic", "Garlic", "রসুন", "Vegetables & herbs", 147, 6.9, 27.6, 0.6, 2.1, 0.09, 11, 0, { g: 1, tsp: 3 }, 0, "FCT 03_0014"],
    ["ginger", "Ginger", "আদা", "Vegetables & herbs", 72, 1.9, 13.3, 0.8, 2.0, 0.2, 12, 0, { g: 1, tsp: 3 }, 0, "FCT 07_0011"],
    ["green_chili", "Green chili", "কাঁচা মরিচ", "Vegetables & herbs", 45, 2.8, 5.9, 0.1, 4.7, 0.02, 12, 0, { g: 1, piece: 3 }, 0, "FCT 03_0010"],
    ["tomato", "Tomato, ripe", "টমেটো", "Vegetables & herbs", 16, 1.1, 1.5, 0.2, 1.7, 0.03, 7, 0, { g: 1, piece: 120 }, 0, "FCT 03_0031"],
    ["cucumber", "Cucumber", "শসা", "Vegetables & herbs", 17, 0.8, 2.9, 0.1, 0.7, 0.01, 2, 0, { g: 1, piece: 200 }, 0, "FCT 03_0012"],
    ["carrot", "Carrot", "গাজর", "Vegetables & herbs", 34, 0.9, 6.0, 0.3, 2.6, 0.04, 54, 0, { g: 1, piece: 60 }, 0, "FCT 03_0008"],
    ["pumpkin", "Pumpkin (mishti kumra)", "মিষ্টি কুমড়া", "Vegetables & herbs", 18, 1.4, 1.3, 0.3, 2.4, 0.05, 8, 0, G, 0, "FCT 03_0028"],
    ["cabbage", "Cabbage", "বাঁধাকপি", "Vegetables & herbs", 24, 1.5, 2.6, 0.3, 2.5, 0.04, 8, 0, G, 0, "FCT 03_0007"],
    ["cauliflower", "Cauliflower", "ফুলকপি", "Vegetables & herbs", 27, 2.6, 2.5, 0.3, 2.0, 0.06, 20, 0, G, 0, "FCT 03_0009"],
    ["eggplant", "Brinjal (begun)", "বেগুন", "Vegetables & herbs", 24, 1.9, 2.0, 0.1, 4.1, 0.01, 8, 0, G, 0, "FCT 03_0005"],
    ["potol", "Pointed gourd (potol)", "পটল", "Vegetables & herbs", 24, 2.0, 2.2, 0.3, 2.2, 0.05, 28, 0, G, 0, "FCT 03_0018"],
    ["okra", "Okra (dherosh)", "ঢেঁড়স", "Vegetables & herbs", 39, 2.1, 5.7, 0.2, 3.1, 0.03, 37, 0, G, 0, "FCT 03_0023"],
    ["bitter_gourd", "Bitter gourd (korola)", "করলা", "Vegetables & herbs", 31, 2.1, 3.6, 0.3, 2.6, 0.03, 36, 0, G, 0, "FCT 03_0016"],
    ["bottle_gourd", "Bottle gourd (lau)", "লাউ", "Vegetables & herbs", 34, 1.1, 6.8, 0.1, 0.6, 0.01, 39, 0, G, 0, "FCT 03_0017"],
    ["green_beans", "Yardlong beans (borboti)", "বরবটি", "Vegetables & herbs", 39, 3.0, 2.8, 0.4, 6.0, 0.1, 23, 0, G, 0, "FCT 03_0011"],
    ["sweet_potato", "Sweet potato", "মিষ্টি আলু", "Vegetables & herbs", 97, 0.9, 21.1, 0.3, 3.0, 0.06, 22, 0, { g: 1, piece: 130 }, 0, "FCT 05_0006"],
    ["lal_shak", "Red amaranth (lal shak)", "লাল শাক", "Vegetables & herbs", 32, 4.5, 0.5, 0.3, 4.2, 0.08, 59, 0, G, 0, "FCT 04_0004"],
    ["palong", "Spinach (palong shak)", "পালং শাক", "Vegetables & herbs", 26, 3.0, 0.9, 0.5, 2.9, 0.08, 171, 0, G, 0, "FCT 04_0025"],
    ["pui_shak", "Indian spinach (pui shak)", "পুঁই শাক", "Vegetables & herbs", 25, 2.4, 2.1, 0.3, 2.2, 0.05, 69, 0, G, 0, "FCT 04_0020"],
    ["coriander", "Coriander leaves", "ধনেপাতা", "Vegetables & herbs", 30, 3.3, 0.1, 0.5, 5.9, 0.03, 58, 0, { g: 1, tbsp: 4 }, 0, "FCT 07_0006"],
    ["lemon", "Lemon juice", "লেবুর রস", "Vegetables & herbs", 22, 0.4, 6.6, 0.2, 0.3, 0.03, 1, 0, { ml: 1, tsp: 5, tbsp: 15, g: 1 }, 0, "USDA 167747"],

    // Fruit
    ["banana", "Banana (sagar)", "কলা", "Fruit", 95, 1.3, 19.2, 0.8, 2.6, 0.3, 10, 0, { piece: 100, g: 1 }, 0, "FCT 08_0004"],
    ["guava", "Guava", "পেয়ারা", "Fruit", 63, 1.0, 10.9, 0.5, 5.4, 0.14, 6, 0, { piece: 100, g: 1 }, 0, "FCT 08_0015"],
    ["mango", "Mango, ripe (fazli)", "আম", "Fruit", 70, 0.9, 14.7, 0.5, 1.6, 0.09, 1, 0, { g: 1, piece: 200 }, 0, "FCT 08_0025"],
    ["papaya", "Papaya, ripe", "পেঁপে", "Fruit", 33, 0.6, 6.5, 0.1, 1.7, 0.04, 4, 0, G, 0, "FCT 08_0035"],
    ["orange", "Orange / malta", "কমলা / মাল্টা", "Fruit", 44, 0.7, 8.7, 0.2, 2.4, 0.02, 5, 0, { piece: 130, g: 1 }, 0, "FCT 08_0031"],
    ["apple", "Apple, with skin", "আপেল", "Fruit", 62, 0.3, 13.5, 0.2, 2.4, 0.03, 1, 0, { piece: 150, g: 1 }, 0, "FCT 08_0002"],
    ["coconut", "Coconut, fresh grated", "নারকেল", "Fruit", 389, 3.3, 6.9, 36.7, 9.2, 32.5, 16, 0, { g: 1, tbsp: 7, cup: 80 }, 0, "FCT 06_0006 (sat fat: USDA ratio)"],

    // Oils & fats (oil: true → affected by the cooking-method retention)
    ["soybean_oil", "Soybean oil", "সয়াবিন তেল", "Oils & fats", 900, 0, 0, 100, 0, 14.1, 0, 0, OIL, { oil: true }, "FCT 13_0012"],
    ["mustard_oil", "Mustard oil", "সরিষার তেল", "Oils & fats", 900, 0, 0, 100, 0, 11.6, 0, 0, OIL, { oil: true }, "FCT 13_0008 (sat fat: USDA)"],
    ["palm_oil", "Palm oil (common in street frying)", "পাম তেল", "Oils & fats", 900, 0, 0, 100, 0, 48.8, 0, 0, OIL, { oil: true }, "FCT 13_0009"],
    ["rice_bran_oil", "Rice bran oil", "রাইস ব্র্যান তেল", "Oils & fats", 884, 0, 0, 100, 0, 19.7, 0, 0, OIL, { oil: true }, "USDA 172338"],
    ["dalda", "Vegetable ghee (dalda / vanaspati)", "ডালডা / বনস্পতি", "Oils & fats", 900, 0, 0, 100, 0, 47, 1, 0, { g: 1, tsp: 4.3, tbsp: 13 }, { oil: true, trans: true }, "FCT 13_0005 (sat fat: estimate)"],
    ["ghee", "Ghee (cow)", "ঘি", "Oils & fats", 898, 0, 0, 99.8, 0, 61.9, 2, 0, { g: 1, tsp: 4.3, tbsp: 13 }, { oil: true }, "FCT 13_0004 (sat fat: USDA)"],
    ["butter", "Butter, salted", "মাখন", "Oils & fats", 733, 0.9, 0.2, 81.0, 0, 51.4, 714, 0, { g: 1, tsp: 5, tbsp: 14 }, { oil: true }, "FCT 13_0001"],

    // Nuts, seeds, spices & sweeteners
    ["peanuts", "Peanuts (china badam)", "চিনাবাদাম", "Nuts, seeds & spices", 585, 22.5, 14.8, 46.6, 8.5, 9.0, 10, 0, { g: 1, tbsp: 9 }, 0, "FCT 06_0007"],
    ["cashew", "Cashew nuts", "কাজু বাদাম", "Nuts, seeds & spices", 595, 18.0, 23.5, 46.9, 3.3, 8.3, 12, 0, { g: 1, tbsp: 9 }, 0, "FCT 06_0002 (sat fat: USDA ratio)"],
    ["almond", "Almonds", "কাঠ বাদাম", "Nuts, seeds & spices", 579, 21.2, 9.1, 49.9, 12.5, 3.8, 1, 0, { g: 1, tbsp: 9 }, 0, "USDA 170567"],
    ["mustard_seed", "Mustard seeds / paste (shorshe)", "সরিষা", "Nuts, seeds & spices", 501, 22.0, 18.5, 35.0, 11.8, 2.0, 13, 0, { g: 1, tsp: 3.3 }, 0, "FCT 06_0012 (sat fat: USDA)"],
    ["sesame", "Sesame seeds (til)", "তিল", "Nuts, seeds & spices", 563, 17.7, 14.3, 45.8, 11.7, 6.2, 11, 0, { g: 1, tsp: 3 }, 0, "FCT 06_0015"],
    ["spice_mix", "Ground spices (turmeric, chili, cumin, coriander)", "গুঁড়া মসলা", "Nuts, seeds & spices", 347, 13.8, 33.3, 12.1, 24.8, 1.5, 62, 0, SPICE, 0, "average of FCT 07_0020, 07_0003, 07_0008, 07_0007"],
    ["salt", "Salt", "লবণ", "Nuts, seeds & spices", 0, 0, 0, 0, 0, 0, 39340, 0, { g: 1, tsp: 6 }, 0, "FCT 15_0007"],
    ["sugar", "Sugar", "চিনি", "Nuts, seeds & spices", 398, 0, 99.5, 0, 0, 0, 5, 99.5, { g: 1, tsp: 4, tbsp: 12.5 }, 0, "FCT 15_0008"],
    ["gur", "Jaggery (akher gur)", "গুড়", "Nuts, seeds & spices", 385, 0.5, 95.4, 0.1, 0, 0, 79, 95.4, { g: 1, tbsp: 15 }, 0, "FCT 15_0004"],
    ["honey", "Honey", "মধু", "Nuts, seeds & spices", 326, 0.3, 81.1, 0, 0.2, 0, 9, 81.1, { g: 1, tsp: 7, tbsp: 21 }, 0, "FCT 15_0003"],
    ["mayonnaise", "Mayonnaise", "মেয়োনিজ", "Nuts, seeds & spices", 680, 1.0, 0.6, 75.0, 0, 11.7, 635, 0.6, { g: 1, tbsp: 14 }, 0, "USDA 171009"],
    ["ketchup", "Tomato ketchup / sauce", "টমেটো সস", "Nuts, seeds & spices", 101, 1.0, 26.9, 0.1, 0.3, 0.02, 907, 21, { g: 1, tbsp: 17 }, 0, "USDA 168556"],
  ];

  const INGREDIENTS = {};
  RAW.forEach(([id, name, bn, cat, kcal, p, c, f, fib, sat, na, sug, units, flags, src]) => {
    INGREDIENTS[id] = { id, name, bn, cat, kcal, p, c, f, fib, sat, na, sug, units, src, oil: !!(flags && flags.oil), trans: !!(flags && flags.trans), fct: /^FCT|average of|FCT /.test(src) };
  });

  // Reference values for a 2,000 kcal adult day (FDA Daily Values for the label;
  // WHO limits for sodium, saturated fat and free sugars are used in the health check)
  const DV = { kcal: 2000, p: 50, c: 275, f: 78, fib: 28, sat: 20, na: 2000, sug: 50 };

  /** rows: [{id, amount, unit}] → totals for the whole recipe */
  function compute(rows, opts) {
    const oilKeep = opts && opts.oilRetention != null ? opts.oilRetention : 1;
    const t = { kcal: 0, p: 0, c: 0, f: 0, fib: 0, sat: 0, na: 0, sug: 0, grams: 0 };
    rows.forEach((r) => {
      const ing = INGREDIENTS[r.id];
      if (!ing) return;
      const per = ing.units[r.unit] != null ? ing.units[r.unit] : 1;
      let grams = (parseFloat(r.amount) || 0) * per;
      t.grams += grams;
      if (ing.oil) grams *= oilKeep;
      const k = grams / 100;
      t.kcal += ing.kcal * k; t.p += ing.p * k; t.c += ing.c * k; t.f += ing.f * k; t.fib += ing.fib * k;
      t.sat += ing.sat * k; t.na += ing.na * k; t.sug += ing.sug * k;
    });
    return t;
  }

  /** share of energy from each macro (Atwater 4/4/9), as fractions summing to 1 */
  function energySplit(t) {
    const pe = t.p * 4, ce = t.c * 4, fe = t.f * 9;
    const sum = pe + ce + fe || 1;
    return { p: pe / sum, c: ce / sum, f: fe / sum };
  }

  const MENU = [
    {
      slug: "egg-chickpea-salad-bowl",
      name: "Egg, Chickpea & Salad Bowl",
      bn: "ডিম-ছোলা সালাদ বোল",
      meal: "Breakfast",
      plate: "Light",
      price: 50,
      img: "egg-chickpea-bowl.jpg",
      blurb: "Boiled egg, tender chola and crunchy salad, brightened with lemon. No added oil.",
      story: "A breakfast that keeps you going until noon without weighing you down. Chickpeas bring slow-digesting carbohydrate and fibre, the egg adds complete protein, and the raw vegetables add crunch and colour. It is dressed with lemon, roasted cumin and black salt instead of oil.",
      ingredients: [
        { id: "egg", amount: 1, unit: "piece" },
        { id: "chickpea_boiled", amount: 80, unit: "g" },
        { id: "potato", amount: 60, unit: "g" },
        { id: "cucumber", amount: 50, unit: "g" },
        { id: "carrot", amount: 30, unit: "g" },
        { id: "tomato", amount: 40, unit: "g" },
        { id: "lemon", amount: 2, unit: "tsp" },
        { id: "spice_mix", amount: 1, unit: "g" },
      ],
      steps: [
        "Soak chickpeas overnight, then boil until tender and drain.",
        "Boil the egg for 9 minutes, cool in water, peel and quarter.",
        "Boil diced potato until just tender; let it cool slightly.",
        "Chop cucumber, carrot and tomato into even, bite-sized pieces.",
        "Toss everything with lemon juice, roasted cumin and black salt; top with the egg.",
      ],
      allergens: ["Egg"],
    },
    {
      slug: "tasty-chicken-breakfast",
      name: "Tasty Chicken Breakfast",
      bn: "মুরগির সকালের প্লেট",
      meal: "Breakfast",
      plate: "Balanced",
      price: 70,
      img: "chicken-breakfast.jpg",
      blurb: "Spiced broiler chicken with boiled potato and seasonal vegetables.",
      story: "A warm, savoury start for the days with back-to-back classes. A measured piece of bone-in chicken is marinated in home-style spices and cooked with very little oil, then served beside boiled potato and lightly cooked vegetables.",
      ingredients: [
        { id: "chicken_bonein", amount: 100, unit: "g" },
        { id: "potato", amount: 80, unit: "g" },
        { id: "mixed_veg", amount: 80, unit: "g" },
        { id: "onion", amount: 15, unit: "g" },
        { id: "garlic", amount: 3, unit: "g" },
        { id: "ginger", amount: 3, unit: "g" },
        { id: "spice_mix", amount: 3, unit: "g" },
        { id: "soybean_oil", amount: 7, unit: "ml" },
      ],
      steps: [
        "Marinate the chicken with ginger-garlic paste, turmeric, chili and salt for 20 minutes.",
        "Sauté onion in a measured 7 ml of oil until soft.",
        "Add the chicken and cook covered on medium heat until done, with a splash of water if needed.",
        "Boil the potato and steam the vegetables separately.",
        "Plate the chicken with potato and vegetables; finish with coriander.",
      ],
      allergens: [],
    },
    {
      slug: "chicken-vegetable-wrap",
      name: "Chicken-Vegetable Wrap",
      bn: "চিকেন-সবজি র‍্যাপ",
      meal: "Breakfast",
      plate: "Balanced",
      price: 80,
      img: "chicken-veg-wrap.jpg",
      blurb: "Spiced chicken, crunchy vegetables and a light yogurt sauce, rolled in a fresh ruti.",
      story: "Breakfast you can carry to class. Seasoned chicken is cooked with a measured spoon of oil, then rolled with crisp cabbage, carrot, cucumber and onion in a fresh atta ruti. A tangy yogurt sauce replaces mayonnaise, so it stays creamy without the extra fat.",
      ingredients: [
        { id: "ruti", amount: 60, unit: "g" },
        { id: "chicken_bonein", amount: 75, unit: "g" },
        { id: "cabbage", amount: 25, unit: "g" },
        { id: "carrot", amount: 15, unit: "g" },
        { id: "cucumber", amount: 20, unit: "g" },
        { id: "onion", amount: 10, unit: "g" },
        { id: "doi", amount: 30, unit: "g" },
        { id: "lemon", amount: 1, unit: "tsp" },
        { id: "garlic", amount: 2, unit: "g" },
        { id: "spice_mix", amount: 2, unit: "g" },
        { id: "soybean_oil", amount: 5, unit: "ml" },
      ],
      steps: [
        "Season the chicken with turmeric, chili, cumin, garlic and salt; rest for 15 minutes.",
        "Cook the chicken in a measured 5 ml of oil until done, then pull the meat off the bone.",
        "Slice the cabbage, carrot, cucumber and onion thinly.",
        "Whisk plain yogurt with lemon juice and a pinch of roasted cumin for the sauce.",
        "Warm a fresh ruti, fill with chicken, vegetables and sauce, and roll it tightly.",
      ],
      allergens: ["Milk (yogurt)", "Wheat (gluten)"],
    },
    {
      slug: "chicken-rice",
      name: "Chicken Rice",
      bn: "চিকেন রাইস",
      meal: "Lunch",
      plate: "Balanced",
      price: 99,
      img: "chicken-veg-rice.jpg",
      blurb: "Home-style chicken curry with a measured plate of rice and vegetables.",
      story: "The lunch most students already love, rebuilt with a measured portion. The curry uses a fixed amount of oil, the rice is portioned by weight, and seasonal vegetables fill the rest of the plate - so the number on the label is the number on your plate.",
      ingredients: [
        { id: "rice_cooked", amount: 200, unit: "g" },
        { id: "chicken_bonein", amount: 125, unit: "g" },
        { id: "mixed_veg", amount: 100, unit: "g" },
        { id: "onion", amount: 20, unit: "g" },
        { id: "garlic", amount: 5, unit: "g" },
        { id: "ginger", amount: 5, unit: "g" },
        { id: "spice_mix", amount: 4, unit: "g" },
        { id: "soybean_oil", amount: 10, unit: "ml" },
      ],
      steps: [
        "Wash and cook the rice; portion 200 g of cooked rice per box.",
        "Sauté onion, ginger and garlic in a measured 10 ml of oil.",
        "Add spices and the chicken; cook covered until tender and the gravy thickens.",
        "Lightly cook the seasonal vegetables with salt and turmeric.",
        "Serve chicken, rice and vegetables in separate sections of the box.",
      ],
      allergens: [],
    },
    {
      slug: "egg-chicken-veggie-rice",
      name: "Egg, Chicken & Veggie Rice",
      bn: "ডিম, মুরগি ও সবজি ভাত",
      meal: "Lunch",
      plate: "High-Protein",
      price: 145,
      img: "chicken-egg-veg-rice.jpg",
      blurb: "Rice with chicken, an egg and a generous portion of seasonal vegetables.",
      story: "Our most complete lunch box. Two protein sources - chicken and egg - sit beside rice and more vegetables than any other plate on the menu. A good pick for long lab days, sports practice or anyone trying to eat more protein.",
      ingredients: [
        { id: "rice_cooked", amount: 200, unit: "g" },
        { id: "egg", amount: 1, unit: "piece" },
        { id: "chicken_bonein", amount: 125, unit: "g" },
        { id: "mixed_veg", amount: 120, unit: "g" },
        { id: "onion", amount: 20, unit: "g" },
        { id: "garlic", amount: 5, unit: "g" },
        { id: "ginger", amount: 5, unit: "g" },
        { id: "spice_mix", amount: 4, unit: "g" },
        { id: "soybean_oil", amount: 12, unit: "ml" },
      ],
      steps: [
        "Cook the rice and portion 200 g per box.",
        "Cook the chicken in a light onion-ginger-garlic masala with a measured amount of oil.",
        "Boil or half-fry the egg using the remaining measured oil.",
        "Sauté the seasonal vegetables briefly so they keep their colour and bite.",
        "Assemble rice, chicken, egg and vegetables in the box.",
      ],
      allergens: ["Egg"],
    },
    {
      slug: "rohu-fish-protein-meal",
      name: "Rohu Fish Protein Meal",
      bn: "সরষে রুই ভাত",
      meal: "Lunch",
      plate: "High-Protein",
      price: 190,
      img: "rohu-meal.jpg",
      blurb: "Rohu in a mustard gravy with rice and vegetables. Bengali comfort food, carefully portioned.",
      story: "Shorshe rui is one of the dishes Bengali families make most often, and we wanted to keep it on campus. A thick steak of rohu is cooked in mustard paste and mustard oil, then served with rice and seasonal vegetables.",
      ingredients: [
        { id: "rice_cooked", amount: 200, unit: "g" },
        { id: "rohu_steak", amount: 150, unit: "g" },
        { id: "mixed_veg", amount: 100, unit: "g" },
        { id: "mustard_seed", amount: 8, unit: "g" },
        { id: "mustard_oil", amount: 10, unit: "ml" },
        { id: "onion", amount: 15, unit: "g" },
        { id: "green_chili", amount: 6, unit: "g" },
        { id: "spice_mix", amount: 3, unit: "g" },
      ],
      steps: [
        "Rub the rohu steak with turmeric and salt; rest for 10 minutes.",
        "Grind mustard seeds with green chili and a pinch of salt into a smooth paste.",
        "Sear the fish lightly in a measured 10 ml of mustard oil.",
        "Add the mustard paste and a little water; simmer until the gravy coats the fish.",
        "Serve with 200 g of rice and seasonal vegetables.",
      ],
      allergens: ["Fish", "Mustard"],
    },
  ];

  MENU.forEach((m) => {
    m.nutrition = compute(m.ingredients);
    m.split = energySplit(m.nutrition);
  });

  /* Cooking methods → share of the measured fat that ends up in the food.
     Curries keep essentially all of it; deep-frying keeps only what the food
     absorbs (typically ~8–25% of the food's weight; 12% of the pan oil is a
     middle estimate when you enter the whole amount of oil in the pan). */
  const METHODS = [
    { id: "boiled", name: "Boiled / steamed", keep: 100, hint: "Any oil you add is eaten" },
    { id: "curry", name: "Curry / bhuna", keep: 100, hint: "Oil stays in the gravy" },
    { id: "stirfry", name: "Stir-fry / bhaji", keep: 95, hint: "Almost all oil is eaten" },
    { id: "shallow", name: "Shallow-fry", keep: 70, hint: "Some oil stays in the pan" },
    { id: "deep", name: "Deep-fry", keep: 12, hint: "Enter all the oil in the pan" },
  ];

  /* Example home recipes for the calculator (whole pot; servings set per recipe) */
  const HOME = [
    { id: "home-dal", name: "Masoor dal", servings: 4, method: "curry", rows: [
      { id: "masoor_dry", amount: 150, unit: "g" }, { id: "onion", amount: 40, unit: "g" }, { id: "garlic", amount: 6, unit: "g" },
      { id: "green_chili", amount: 6, unit: "g" }, { id: "spice_mix", amount: 2, unit: "tsp" }, { id: "soybean_oil", amount: 2, unit: "tbsp" } ] },
    { id: "home-egg-curry", name: "Egg curry with potato", servings: 2, method: "curry", rows: [
      { id: "egg", amount: 4, unit: "piece" }, { id: "potato", amount: 200, unit: "g" }, { id: "onion", amount: 80, unit: "g" },
      { id: "tomato", amount: 100, unit: "g" }, { id: "ginger", amount: 6, unit: "g" }, { id: "garlic", amount: 6, unit: "g" },
      { id: "spice_mix", amount: 3, unit: "tsp" }, { id: "soybean_oil", amount: 3, unit: "tbsp" } ] },
    { id: "home-khichuri", name: "Bhuna khichuri", servings: 3, method: "curry", rows: [
      { id: "rice_raw", amount: 200, unit: "g" }, { id: "mung_dry", amount: 100, unit: "g" }, { id: "mixed_veg", amount: 200, unit: "g" },
      { id: "onion", amount: 50, unit: "g" }, { id: "ginger", amount: 6, unit: "g" }, { id: "spice_mix", amount: 2, unit: "tsp" },
      { id: "ghee", amount: 1, unit: "tbsp" }, { id: "soybean_oil", amount: 1, unit: "tbsp" } ] },
    { id: "home-beguni", name: "Beguni (10 pieces)", servings: 10, method: "deep", rows: [
      { id: "eggplant", amount: 250, unit: "g" }, { id: "besan", amount: 100, unit: "g" }, { id: "spice_mix", amount: 1, unit: "tsp" },
      { id: "soybean_oil", amount: 500, unit: "ml" } ] },
  ];

  window.NC = { INGREDIENTS, MENU, DV, METHODS, HOME, compute, energySplit };
})();

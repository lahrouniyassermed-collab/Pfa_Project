"""
Seed du menu complet MangerManger via API REST.
Prerequis : backend en cours sur localhost:8001
Usage     : python seed_menu.py [--login gerant1 --password 1234]
"""
import sys
import argparse
import requests as http

BASE = "http://localhost:8001"

def get_token(username, password):
    r = http.post(f"{BASE}/api/auth/login",
                  data={"username": username, "password": password})
    if r.status_code != 200:
        print(f"ERREUR login ({r.status_code}): {r.text[:200]}")
        sys.exit(1)
    return r.json()["access_token"]

def api_post(path, body, hdrs):
    r = http.post(f"{BASE}{path}", json=body, headers=hdrs)
    if r.status_code not in (200, 201):
        print(f"  WARN POST {path} -> {r.status_code}: {r.text[:120]}")
        return None
    return r.json()

def api_delete(path, hdrs):
    r = http.delete(f"{BASE}{path}", headers=hdrs)
    return r.json() if r.content else {}

CATEGORIES = [
    {"nom": "Entrees",              "ordre": 1},
    {"nom": "Salades",              "ordre": 2},
    {"nom": "Soupes",               "ordre": 3},
    {"nom": "Plats chauds",         "ordre": 4},
    {"nom": "Grillades",            "ordre": 5},
    {"nom": "Pizzas et Pates",      "ordre": 6},
    {"nom": "Sandwichs et Burgers", "ordre": 7},
    {"nom": "Desserts",             "ordre": 8},
    {"nom": "Jus frais",            "ordre": 9},
    {"nom": "Boissons",             "ordre": 10},
]

# (nom, unite, stock_initial, seuil_alerte)
INGREDIENTS = [
    ("Farine de ble",       "kg",  20,  5),
    ("Tomates",             "kg",  15,  3),
    ("Oignons",             "kg",  10,  2),
    ("Ail",                 "kg",   5,  1),
    ("Huile olive",         "L",   10,  2),
    ("Huile vegetale",      "L",   10,  2),
    ("Sel",                 "kg",   5,  1),
    ("Poivre noir",         "kg",   2,  0.5),
    ("Poulet entier",       "kg",  20,  5),
    ("Filet de poulet",     "kg",  15,  3),
    ("Viande hachee boeuf", "kg",  10,  3),
    ("Cotes agneau",        "kg",   8,  2),
    ("Merguez",             "kg",   8,  2),
    ("Boeuf cubes",         "kg",  10,  3),
    ("Mozzarella",          "kg",   8,  2),
    ("Parmesan",            "kg",   3,  1),
    ("Emmental rape",       "kg",   5,  1),
    ("Creme fraiche",       "L",    5,  1),
    ("Beurre",              "kg",   5,  1),
    ("Lait",                "L",   10,  2),
    ("Jaunes oeufs",        "pcs", 50, 10),
    ("Oeufs",               "pcs", 50, 10),
    ("Laitue romaine",      "kg",   5,  1),
    ("Concombre",           "kg",   5,  1),
    ("Poivrons",            "kg",   5,  1),
    ("Courgettes",          "kg",   5,  1),
    ("Carottes",            "kg",   8,  2),
    ("Pommes de terre",     "kg",  15,  3),
    ("Riz",                 "kg",  20,  5),
    ("Pates spaghetti",     "kg",  10,  2),
    ("Semoule couscous",    "kg",  10,  2),
    ("Persil",              "kg",   2,  0.5),
    ("Coriandre",           "kg",   2,  0.5),
    ("Citron",              "kg",   5,  1),
    ("Olives noires",       "kg",   3,  1),
    ("Thon en boite",       "kg",   5,  1),
    ("Pain burger",         "pcs", 30, 10),
    ("Pain panini",         "pcs", 30, 10),
    ("Pate a pizza",        "kg",  10,  3),
    ("Sauce tomate",        "kg",  10,  2),
    ("Sauce BBQ",           "L",    3,  1),
    ("Mascarpone",          "kg",   3,  1),
    ("Cafe",                "kg",   5,  1),
    ("The menthe",          "kg",   2,  0.5),
    ("Oranges",             "kg",  20,  5),
    ("Pommes",              "kg",  10,  2),
    ("Bananes",             "kg",  10,  2),
    ("Fraises",             "kg",   5,  1),
    ("Avocat",              "kg",   5,  1),
    ("Gingembre",           "kg",   2,  0.5),
    ("Cacao",               "kg",   2,  0.5),
    ("Sucre",               "kg",  10,  2),
    ("Vanille",             "kg",   1,  0.2),
    ("Vermicelles",         "kg",   5,  1),
    ("Citrons confits",     "kg",   3,  1),
    ("Ras el hanout",       "kg",   2,  0.5),
    ("Lardons",             "kg",   5,  1),
    ("Anchois",             "kg",   2,  0.5),
]

# (nom, description, prix_dh, categorie, vegetarien, sans_gluten, allergenes_csv, [(ing, g)])
PLATS = [
    # ── Entrees ──────────────────────────────────────────────────────────────
    ("Bruschetta tomate-basilic",
     "Pain grille, tomates fraiches, ail et huile d'olive",
     42, "Entrees", True, False, "gluten",
     [("Farine de ble",80),("Tomates",100),("Ail",10),("Huile olive",15)]),

    ("Assiette de mezze",
     "Assortiment de dips et crudites maison : houmous, tzatziki, crudites",
     65, "Entrees", True, True, "",
     [("Concombre",80),("Tomates",60),("Persil",20),("Huile olive",20),("Citron",30)]),

    ("Salade de thon",
     "Thon, oeufs durs, olives, tomates et vinaigrette maison",
     58, "Entrees", False, True, "poisson,oeuf",
     [("Thon en boite",80),("Oeufs",50),("Tomates",80),("Olives noires",30),("Huile olive",15)]),

    # ── Salades ──────────────────────────────────────────────────────────────
    ("Salade Cesar",
     "Laitue romaine, poulet grille, parmesan, anchois et sauce Cesar",
     72, "Salades", False, False, "gluten,lactose,oeuf",
     [("Laitue romaine",120),("Filet de poulet",100),("Parmesan",25),("Anchois",15),("Creme fraiche",30)]),

    ("Salade nicoise",
     "Thon, tomates, oeufs, olives et anchois",
     68, "Salades", False, True, "poisson,oeuf",
     [("Thon en boite",80),("Tomates",100),("Oeufs",60),("Olives noires",30),("Anchois",15)]),

    ("Tabbule libanais",
     "Persil frais, tomates, citron, huile d'olive et semoule fine",
     48, "Salades", True, False, "gluten",
     [("Persil",100),("Tomates",120),("Semoule couscous",60),("Citron",40),("Huile olive",20)]),

    ("Salade marocaine",
     "Tomates, concombres, poivrons, oignons et vinaigrette citron",
     42, "Salades", True, True, "",
     [("Tomates",120),("Concombre",80),("Poivrons",60),("Oignons",40),("Persil",20)]),

    # ── Soupes ───────────────────────────────────────────────────────────────
    ("Harira",
     "Soupe marocaine aux tomates, lentilles et epices traditionnelles",
     38, "Soupes", True, True, "",
     [("Tomates",150),("Oignons",60),("Coriandre",15),("Persil",15),("Citron",30),("Ras el hanout",5)]),

    ("Soupe poulet-vermicelles",
     "Bouillon de poulet maison avec vermicelles et legumes",
     45, "Soupes", False, False, "gluten",
     [("Filet de poulet",100),("Vermicelles",40),("Carottes",60),("Oignons",40),("Coriandre",10)]),

    ("Soupe oignon gratinee",
     "Soupe a l'oignon caramelise, crouton et emmental fondu",
     52, "Soupes", True, False, "gluten,lactose",
     [("Oignons",200),("Beurre",20),("Farine de ble",15),("Emmental rape",40),("Pain panini",40)]),

    # ── Plats chauds ─────────────────────────────────────────────────────────
    ("Tajine poulet citron confit",
     "Tajine traditionnel au poulet, citrons confits et olives, avec pain",
     98, "Plats chauds", False, True, "",
     [("Poulet entier",300),("Citrons confits",40),("Olives noires",30),("Oignons",60),("Ras el hanout",8)]),

    ("Poulet roti au four",
     "Demi-poulet roti aux herbes aromatiques, accompagne de frites maison",
     92, "Plats chauds", False, True, "",
     [("Poulet entier",350),("Ail",15),("Citron",40),("Huile olive",20),("Pommes de terre",200)]),

    ("Couscous royal",
     "Couscous avec agneau, poulet, merguez et legumes mijotes au bouillon",
     118, "Plats chauds", False, False, "gluten",
     [("Semoule couscous",150),("Cotes agneau",120),("Poulet entier",100),("Merguez",60),("Courgettes",80),("Carottes",80)]),

    ("Riz saute aux legumes",
     "Riz basmati, poivrons, courgettes, carottes sautees a l'huile",
     62, "Plats chauds", True, True, "",
     [("Riz",150),("Poivrons",80),("Courgettes",80),("Carottes",60),("Oignons",40),("Huile vegetale",15)]),

    ("Tajine kefta tomate",
     "Boulettes de viande en sauce tomate epicee, oeufs poches",
     88, "Plats chauds", False, True, "oeuf",
     [("Viande hachee boeuf",200),("Tomates",200),("Oeufs",60),("Oignons",50),("Ras el hanout",8)]),

    # ── Grillades ────────────────────────────────────────────────────────────
    ("Brochettes de boeuf",
     "Boeuf marine aux epices, servies avec salade et pain",
     105, "Grillades", False, True, "",
     [("Boeuf cubes",250),("Oignons",50),("Poivrons",60),("Ras el hanout",8),("Huile olive",15)]),

    ("Filet de poulet grille",
     "Poulet grille au charbon, sauce a l'ail et frites maison",
     92, "Grillades", False, True, "",
     [("Filet de poulet",250),("Ail",15),("Citron",30),("Huile olive",15),("Pommes de terre",180)]),

    ("Cotes agneau grillees",
     "Cotes d'agneau grillees, herbes fraiches et legumes grilles",
     128, "Grillades", False, True, "",
     [("Cotes agneau",300),("Ail",10),("Citron",30),("Huile olive",20),("Courgettes",80)]),

    ("Assiette merguez",
     "Merguez grillees au charbon, harissa maison et pain",
     88, "Grillades", False, True, "",
     [("Merguez",200),("Oignons",60),("Poivrons",60),("Huile vegetale",10)]),

    # ── Pizzas & Pates ───────────────────────────────────────────────────────
    ("Pizza Margherita",
     "Sauce tomate, mozzarella fraiche et basilic",
     78, "Pizzas et Pates", True, False, "gluten,lactose",
     [("Pate a pizza",200),("Sauce tomate",80),("Mozzarella",120),("Huile olive",10)]),

    ("Pizza Poulet BBQ",
     "Poulet grille, sauce BBQ, poivrons et emmental",
     92, "Pizzas et Pates", False, False, "gluten,lactose",
     [("Pate a pizza",200),("Sauce BBQ",60),("Filet de poulet",100),("Poivrons",60),("Emmental rape",80)]),

    ("Pizza 4 fromages",
     "Mozzarella, emmental, parmesan et chevre sur sauce tomate",
     88, "Pizzas et Pates", True, False, "gluten,lactose",
     [("Pate a pizza",200),("Sauce tomate",60),("Mozzarella",80),("Emmental rape",60),("Parmesan",30)]),

    ("Spaghetti bolognaise",
     "Spaghettis al dente, sauce bolognaise maison et parmesan",
     78, "Pizzas et Pates", False, False, "gluten,lactose",
     [("Pates spaghetti",150),("Viande hachee boeuf",120),("Sauce tomate",100),("Oignons",40),("Parmesan",20)]),

    ("Penne carbonara",
     "Penne, lardons, creme fraiche, parmesan et jaune d'oeuf",
     82, "Pizzas et Pates", False, False, "gluten,lactose,oeuf",
     [("Pates spaghetti",150),("Lardons",80),("Creme fraiche",80),("Parmesan",25),("Jaunes oeufs",30)]),

    # ── Sandwichs & Burgers ──────────────────────────────────────────────────
    ("Burger classique",
     "Pain brioché, steak hache, salade, tomate, fromage et sauce maison",
     82, "Sandwichs et Burgers", False, False, "gluten,lactose,oeuf",
     [("Pain burger",80),("Viande hachee boeuf",150),("Laitue romaine",30),("Tomates",60),("Emmental rape",30)]),

    ("Burger poulet croustillant",
     "Poulet pane, coleslaw et sauce tartare",
     78, "Sandwichs et Burgers", False, False, "gluten,lactose,oeuf",
     [("Pain burger",80),("Filet de poulet",150),("Laitue romaine",30),("Tomates",50),("Creme fraiche",30)]),

    ("Panini thon-mozzarella",
     "Panini grille, thon, mozzarella et tomates",
     55, "Sandwichs et Burgers", False, False, "gluten,lactose,poisson",
     [("Pain panini",100),("Thon en boite",80),("Mozzarella",60),("Tomates",50)]),

    # ── Desserts ─────────────────────────────────────────────────────────────
    ("Tiramisu",
     "Mascarpone, cafe, biscuits et cacao — recette classique italienne",
     52, "Desserts", True, False, "gluten,lactose,oeuf",
     [("Mascarpone",100),("Jaunes oeufs",40),("Sucre",30),("Cafe",40),("Cacao",10),("Farine de ble",30)]),

    ("Moelleux au chocolat",
     "Gateau fondant chocolat noir, coeur coulant, servi chaud",
     48, "Desserts", True, False, "gluten,lactose,oeuf",
     [("Cacao",40),("Beurre",60),("Sucre",50),("Oeufs",60),("Farine de ble",30)]),

    ("Creme brulee",
     "Creme vanille onctueuse, caramel croustillant",
     45, "Desserts", True, True, "lactose,oeuf",
     [("Creme fraiche",150),("Jaunes oeufs",60),("Sucre",40),("Vanille",5)]),

    ("Pastilla au lait",
     "Feuilles de pastilla au lait parfume, amandes et cannelle",
     42, "Desserts", True, False, "gluten,lactose,noix",
     [("Farine de ble",60),("Lait",120),("Sucre",40),("Beurre",30)]),

    ("Salade de fruits frais",
     "Fruits de saison, sirop de menthe et jus de citron",
     38, "Desserts", True, True, "",
     [("Pommes",80),("Bananes",80),("Fraises",80),("Citron",20),("Sucre",15)]),

    # ── Jus frais ────────────────────────────────────────────────────────────
    ("Jus orange frais",
     "Oranges pressees a la minute, sans sucre ajoute",
     28, "Jus frais", True, True, "",
     [("Oranges",300)]),

    ("Jus pomme-gingembre",
     "Pommes fraiches pressees avec gingembre frais",
     35, "Jus frais", True, True, "",
     [("Pommes",250),("Gingembre",15)]),

    ("Smoothie banane-fraise",
     "Banane, fraises, lait et sucre — onctueux et frais",
     38, "Jus frais", True, True, "lactose",
     [("Bananes",100),("Fraises",100),("Lait",150),("Sucre",10)]),

    ("Jus avocat au lait",
     "Avocat frais mixe avec lait et sucre",
     42, "Jus frais", True, True, "lactose",
     [("Avocat",120),("Lait",150),("Sucre",20)]),

    # ── Boissons ─────────────────────────────────────────────────────────────
    ("Cafe expresso",
     "Expresso serre, blend arabica-robusta",
     18, "Boissons", True, True, "",
     [("Cafe",8)]),

    ("Cafe latte",
     "Expresso avec lait chaud mousseux",
     28, "Boissons", True, True, "lactose",
     [("Cafe",8),("Lait",180)]),

    ("The a la menthe",
     "The vert marocain a la menthe fraiche et sucre",
     15, "Boissons", True, True, "",
     [("The menthe",5),("Sucre",20)]),

    ("Eau minerale 50cl",
     "Eau minerale naturelle fraiche",
     12, "Boissons", True, True, "",
     [("Sel",1)]),

    ("Coca-Cola 33cl",
     "Coca-Cola original bien frais",
     22, "Boissons", True, True, "",
     [("Sucre",35)]),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--login",    default="gerant1")
    parser.add_argument("--password", default="1234")
    args = parser.parse_args()

    print(f"Connexion au backend {BASE} ...")
    token = get_token(args.login, args.password)
    hdrs = {"Authorization": f"Bearer {token}"}
    print("OK\n")

    # 1. Supprimer tous les plats existants
    print("Suppression des anciens plats...")
    res = api_delete("/api/plats/admin/tout", hdrs)
    print(f"  {res.get('message', res)}\n")

    # 2. Categories
    print("Creation des categories...")
    cat_ids = {}
    for cat in CATEGORIES:
        r = api_post("/api/categories/", cat, hdrs)
        if r:
            cat_ids[cat["nom"]] = r["id"]
            print(f"  {cat['nom']}")

    # 3. Ingredients (Open Food Facts auto-fetch)
    print(f"\nCreation de {len(INGREDIENTS)} ingredients (nutrition via Open Food Facts)...")
    ing_ids = {}
    for nom, unite, stock, seuil in INGREDIENTS:
        r = api_post("/api/ingredients/", {
            "nom": nom, "unite": unite,
            "quantite_stock": stock, "seuil_alerte": seuil
        }, hdrs)
        if r:
            ing_ids[nom] = r["id"]
            kcal = r.get("calories_par_100g")
            suffix = f"  [{kcal:.0f} kcal/100g]" if kcal else ""
            print(f"  {nom}{suffix}")

    # 4. Plats
    print(f"\nCreation de {len(PLATS)} plats...")
    ok = 0
    for nom, desc, prix, cat_nom, vege, sg, allergenes, ings in PLATS:
        cat_id = cat_ids.get(cat_nom)
        if not cat_id:
            print(f"  WARN categorie '{cat_nom}' manquante pour '{nom}'")
            continue
        ingredients_payload = [
            {"ingredient_id": ing_ids[n], "quantite": q}
            for n, q in ings if n in ing_ids
        ]
        r = api_post("/api/plats/admin/creer", {
            "nom": nom, "description": desc, "prix": prix,
            "categorie_id": cat_id, "vegetarien": vege,
            "sans_gluten": sg, "allergenes": allergenes,
            "ingredients": ingredients_payload,
        }, hdrs)
        if r:
            ok += 1
            flags = []
            if vege: flags.append("vege")
            if sg:   flags.append("sg")
            tag = f" [{','.join(flags)}]" if flags else ""
            print(f"  {nom} — {prix} Dh{tag}")

    print(f"\n{'='*50}")
    print(f"MENU SEED TERMINE : {ok} plats dans {len(cat_ids)} categories")
    print(f"Nutrition calculee automatiquement depuis les ingredients.")
    print(f"Swagger : {BASE}/docs")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()

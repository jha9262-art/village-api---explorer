import pandas as pd
import os
import psycopg2

# =========================
# 1. Folder path (CHANGE IF NEEDED)
# =========================
folder_path = r"C:\Users\balaj\OneDrive\Desktop\capstone\data"

# =========================
# 2. Read all Excel files
# =========================
all_data = []

for file in os.listdir(folder_path):
    if file.endswith(".xls") or file.endswith(".xlsx"):
        file_path = os.path.join(folder_path, file)
        print(f"Reading file: {file}")

        df = pd.read_excel(file_path)
        df.columns = df.columns.str.strip()

        all_data.append(df)

# Combine all data
combined_df = pd.concat(all_data, ignore_index=True)

# Remove duplicates
combined_df = combined_df.drop_duplicates()

print("\nTotal Rows:", len(combined_df))

# =========================
# 3. Split structured data
# =========================
states = combined_df[['MDDS STC', 'STATE NAME']].drop_duplicates()

districts = combined_df[combined_df['MDDS DTC'] != 0][['MDDS DTC', 'DISTRICT NAME', 'MDDS STC']].drop_duplicates()

subdistricts = combined_df[combined_df['MDDS Sub_DT'] != 0][['MDDS Sub_DT', 'SUB-DISTRICT NAME', 'MDDS DTC']].drop_duplicates()

villages = combined_df[combined_df['MDDS PLCN'] != 0][['MDDS PLCN', 'Area Name', 'MDDS Sub_DT']].drop_duplicates()

# Normalize code columns and remove ".0" suffixes
states['MDDS STC'] = states['MDDS STC'].astype(str).str.replace('.0', '', regex=False)
districts['MDDS DTC'] = districts['MDDS DTC'].astype(str).str.replace('.0', '', regex=False)
districts['MDDS STC'] = districts['MDDS STC'].astype(str).str.replace('.0', '', regex=False)
subdistricts['MDDS Sub_DT'] = subdistricts['MDDS Sub_DT'].astype(str).str.replace('.0', '', regex=False)
subdistricts['MDDS DTC'] = subdistricts['MDDS DTC'].astype(str).str.replace('.0', '', regex=False)
villages['MDDS PLCN'] = villages['MDDS PLCN'].astype(str).str.replace('.0', '', regex=False)
villages['MDDS Sub_DT'] = villages['MDDS Sub_DT'].astype(str).str.replace('.0', '', regex=False)

# =========================
# 4. Connect PostgreSQL
# =========================
conn = psycopg2.connect(
    host="localhost",
    database="village_api",
    user="postgres",
    password="bala9262@",
    port="5432"
)

cur = conn.cursor()

# =========================
# 5. Insert Country
# =========================
cur.execute("""
    INSERT INTO country (name)
    VALUES (%s)
    ON CONFLICT (name) DO NOTHING;
""", ("India",))

conn.commit()

cur.execute("SELECT id FROM country WHERE name = %s;", ("India",))
country_id = cur.fetchone()[0]

# =========================
# 6. Insert States
# =========================
state_map = {}

for _, row in states.iterrows():
    state_code = str(row['MDDS STC']).strip()
    state_name = str(row['STATE NAME']).strip().title()

    cur.execute("""
        INSERT INTO state (state_code, state_name, country_id)
        VALUES (%s, %s, %s)
        ON CONFLICT (state_code) DO NOTHING;
    """, (state_code, state_name, country_id))

conn.commit()

cur.execute("SELECT id, state_code FROM state;")
for row in cur.fetchall():
    state_map[str(row[1])] = row[0]

# =========================
# 7. Insert Districts
# =========================
district_map = {}

for _, row in districts.iterrows():
    district_code = str(row['MDDS DTC']).strip()
    district_name = str(row['DISTRICT NAME']).strip().title()
    state_code = str(row['MDDS STC']).strip()

    state_id = state_map[state_code]

    cur.execute("""
        INSERT INTO district (district_code, district_name, state_id)
        VALUES (%s, %s, %s)
        ON CONFLICT (district_code) DO NOTHING;
    """, (district_code, district_name, state_id))

conn.commit()

cur.execute("SELECT id, district_code FROM district;")
for row in cur.fetchall():
    district_map[str(row[1])] = row[0]

# =========================
# 8. Insert Subdistricts
# =========================
subdistrict_map = {}

for _, row in subdistricts.iterrows():
    subdistrict_code = str(row['MDDS Sub_DT']).strip()
    subdistrict_name = str(row['SUB-DISTRICT NAME']).strip().title()
    district_code = str(row['MDDS DTC']).strip()

    district_id = district_map[district_code]

    cur.execute("""
        INSERT INTO subdistrict (subdistrict_code, subdistrict_name, district_id)
        VALUES (%s, %s, %s)
        ON CONFLICT (subdistrict_code) DO NOTHING;
    """, (subdistrict_code, subdistrict_name, district_id))

conn.commit()

cur.execute("SELECT id, subdistrict_code FROM subdistrict;")
for row in cur.fetchall():
    subdistrict_map[str(row[1])] = row[0]

# =========================
# 9. Insert Villages
# =========================
for _, row in villages.iterrows():
    village_code = str(row['MDDS PLCN']).strip()
    village_name = str(row['Area Name']).strip().title()
    subdistrict_code = str(row['MDDS Sub_DT']).strip()

    subdistrict_id = subdistrict_map[subdistrict_code]

    cur.execute("""
        INSERT INTO village (village_code, village_name, subdistrict_id)
        VALUES (%s, %s, %s)
        ON CONFLICT (village_code) DO NOTHING;
    """, (village_code, village_name, subdistrict_id))

conn.commit()

print("\n✅ ALL INDIA DATA INSERTED SUCCESSFULLY")

cur.close()
conn.close()
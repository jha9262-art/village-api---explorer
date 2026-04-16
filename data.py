import pandas as pd
import os

# =========================
# Display settings
# =========================
pd.set_option('display.max_columns', None)
pd.set_option('display.width', 200)

# =========================
# Folder path containing REAL Excel files
# =========================
folder_path = r"C:\Users\balaj\OneDrive\Desktop\capstone\data"

# =========================
# Check if folder exists
# =========================
if not os.path.exists(folder_path):
    print("Folder not found. Please check the folder path.")
    print("Current path:", folder_path)
    exit()

# =========================
# Read all Excel files
# =========================
all_data = []

for file in os.listdir(folder_path):
    # skip Mac hidden files
    if file.startswith("._") or file.startswith("~$"):
        continue

    if file.endswith(".xls") or file.endswith(".xlsx"):
        file_path = os.path.join(folder_path, file)
        print(f"Reading file: {file}")

        try:
            if file.endswith(".xls"):
                df = pd.read_excel(file_path, engine="xlrd")
            else:
                df = pd.read_excel(file_path, engine="openpyxl")

            df.columns = df.columns.str.strip()
            all_data.append(df)

        except Exception as e:
            print(f"Skipping file {file} بسبب error: {e}")

# =========================
# Check if files were found
# =========================
if len(all_data) == 0:
    print("No valid Excel files found in the folder.")
    exit()

# =========================
# Combine all files
# =========================
combined_df = pd.concat(all_data, ignore_index=True)
combined_df = combined_df.drop_duplicates()
combined_df.columns = combined_df.columns.str.strip()

# =========================
# Show raw combined data
# =========================
print("\nRAW COMBINED DATA")
print(combined_df.head(10))

# =========================
# Split into structured tables
# =========================
states = combined_df[['MDDS STC', 'STATE NAME']].drop_duplicates()

districts = combined_df[
    combined_df['MDDS DTC'] != 0
][['MDDS DTC', 'DISTRICT NAME', 'MDDS STC']].drop_duplicates()

subdistricts = combined_df[
    combined_df['MDDS Sub_DT'] != 0
][['MDDS Sub_DT', 'SUB-DISTRICT NAME', 'MDDS DTC']].drop_duplicates()

villages = combined_df[
    combined_df['MDDS PLCN'] != 0
][['MDDS PLCN', 'Area Name', 'MDDS Sub_DT']].drop_duplicates()

# =========================
# Rename columns for clarity
# =========================
states.columns = ['state_code', 'state_name']
districts.columns = ['district_code', 'district_name', 'state_code']
subdistricts.columns = ['subdistrict_code', 'subdistrict_name', 'district_code']
villages.columns = ['village_code', 'village_name', 'subdistrict_code']

# =========================
# Show structured data
# =========================
print("\nSTATES")
print(states.head(10))

print("\nDISTRICTS")
print(districts.head(10))

print("\nSUBDISTRICTS")
print(subdistricts.head(10))

print("\nVILLAGES")
print(villages.head(10))

# =========================
# Show counts
# =========================
print("\nCOUNTS:")
print("States:", len(states))
print("Districts:", len(districts))
print("Subdistricts:", len(subdistricts))
print("Villages:", len(villages))

# =========================
# Save output files
# =========================
combined_df.to_csv("all_india_data.csv", index=False)
states.to_csv("states.csv", index=False)
districts.to_csv("districts.csv", index=False)
subdistricts.to_csv("subdistricts.csv", index=False)
villages.to_csv("villages.csv", index=False)

print("\nFiles saved successfully:")
print("1. all_india_data.csv")
print("2. states.csv")
print("3. districts.csv")
print("4. subdistricts.csv")
print("5. villages.csv")
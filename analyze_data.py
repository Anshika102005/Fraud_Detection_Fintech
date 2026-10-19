import pandas as pd
df = pd.read_csv('application_data.csv')
print(f'Dataset shape: {df.shape}')
print(f'Features: {len(df.columns)}')
print(f'Missing values: {df.isnull().sum().sum()}')
"""
Data generation script — creates users.csv (~500MB) and transactions.csv (~500MB)
Run once before starting the API.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import os

DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

def generate_data():
    print("Generating synthetic datasets (approx 500MB each)... This may take a minute.")

    # Generate 5 Million Users
    num_users = 5_000_000
    users = pd.DataFrame({
        'user_id': np.arange(1, num_users + 1),
        'name': ['User_' + str(i) for i in range(num_users)],
        'signup_date': pd.date_range(start='2020-01-01', periods=num_users, freq='min')
    })
    users.to_csv(DATA_DIR / 'users.csv', index=False)
    print(f"✅ users.csv created at {DATA_DIR / 'users.csv'}")

    # Generate 10 Million Transactions
    num_transactions = 10_000_000
    transactions = pd.DataFrame({
        'transaction_id': np.arange(1, num_transactions + 1),
        'user_id': np.random.randint(1, num_users + 1, size=num_transactions),
        'amount': np.random.uniform(5.0, 500.0, size=num_transactions).round(2)
    })
    transactions.to_csv(DATA_DIR / 'transactions.csv', index=False)
    print(f"✅ transactions.csv created at {DATA_DIR / 'transactions.csv'}")

if __name__ == "__main__":
    generate_data()

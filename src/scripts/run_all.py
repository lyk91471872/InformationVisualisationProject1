from preprocess_data import main as preprocess_data
from q1 import main as q1
from q2 import main as q2
from q3 import main as q3
from q4 import main as q4
from q5 import main as q5

def main():
    print("Running preprocess_data...")
    preprocess_data()

    print("Running q1...")
    q1()

    print("Running q2...")
    q2()

    print("Running q3...")
    q3()

    print("Running q4...")
    q4()

    print("Running q5...")
    q5()


if __name__ == "__main__":
    main()

Deep Fake and Image Forgery Detection Using Machine Learning

About the Project

Deep Fake and Image Forgery Detection Using Machine Learning is a project developed to identify whether an image is authentic or forged using machine learning and deep learning techniques.

The system uses image preprocessing, feature extraction, MobileNet, and a hybrid machine learning classifier to analyze images and detect possible manipulations.

Technologies Used

- Python
- Flask
- TensorFlow
- Scikit-learn
- OpenCV
- NumPy
- Joblib
- HTML
- CSS
- JavaScript

 Machine Learning Techniques

- MobileNet
- Random Forest
- Support Vector Machine (SVM)
- Logistic Regression
- Decision Tree
- K-Nearest Neighbors (KNN)
- Gradient Boosting
- AdaBoost
- Gaussian Naive Bayes
- Multi-Layer Perceptron (MLP)
- Voting Classifier

 Project Structure

Deep-Fake-And-Image-Forgery-Detection/
│
├── app.py
├── data_preprocessing.py
├── download_dataset.py
├── extract.py
├── gpu.py
├── hybrid_classifier.py
├── ml.py
├── mobilenet_model.py
├── train_models.py
├── requirements.txt
├── README.md
│
├── templates/
├── static/
│
└── test/
    ├── test/
    │   ├── authentic/
    │   └── forged/
    │
    └── train/
        ├── authentic/
        └── forged/


 Dataset

The dataset contains two categories:

- Authentic: Original images.
- Forged: Manipulated or altered images.

The dataset is divided into training and testing sets.

 Installation

Clone the repository:

git clone YOUR_REPOSITORY_URL

Navigate to the project folder:

cd Deep-Fake-And-Image-Forgery-Detection
Install the required dependencies:
pip install -r requirements.txt
Model Training

Run the training script:
python train_models.py
The training pipeline generates trained models and evaluation outputs.

 Run the Application

Start the Flask application:

python app.py

Open your browser and visit:

http://127.0.0.1:5000/

Deployment

The application is deployed using Render.

 Author

Harika Veeragani

B.Tech – Information Technology

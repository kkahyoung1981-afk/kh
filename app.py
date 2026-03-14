import streamlit as st
import google.generativeai as genai
import os

# 1. API 키 설정 (보안을 위해 환경변수에서 가져옴)
api_key = st.secrets["GOOGLE_API_KEY"]
genai.configure(api_key=api_key)

st.title("나의 AI 서비스: Emiji Pang")

# 2. AI 모델 설정
model = genai.GenerativeModel('gemini-1.5-flash')

# 3. 사용자 입력 받기
user_input = st.text_input("질문을 입력하세요:")

if st.button("전송"):
    if user_input:
        response = model.generate_content(user_input)
        st.write("AI 답변:", response.text)
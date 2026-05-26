import gradio as gr
from dotenv import load_dotenv

from pro_implementation.answer import answer_question

load_dotenv(override=True)

def format_context(context):
    result = "<h2 style='color: #ff77800;"
import subprocess
from pathlib import Path
import gradio as gr

REPO_PATH = Path("/Users/connormurphy/Documents/run-pace-logic_current")

def read_file(filepath):
    try:
        full_path = REPO_PATH / filepath
        if not full_path.exists():
            return f"Error: File {filepath} not found."
        return full_path.read_text(encoding="utf-8")
    except Exception as e:
        return f"Error reading file: {str(e)}"

def write_and_commit_file(filepath, content, commit_message):
    try:
        full_path = REPO_PATH / filepath
        full_path.write_text(content, encoding="utf-8")
        
        subprocess.run(["git", "add", filepath], cwd=REPO_PATH, check=True)
        subprocess.run(["git", "commit", "-m", commit_message], cwd=REPO_PATH, check=True)
        subprocess.run(["git", "push", "origin", "main"], cwd=REPO_PATH, check=True)
        
        return f"Successfully updated {filepath}, committed, and pushed to GitHub!"
    except Exception as e:
        return f"Git/File Error: {str(e)}"

with gr.Blocks(theme=gr.themes.Soft(), title="Odysseus AI - TrainPaceLab") as demo:
    gr.Markdown("# 🚀 Odysseus Autonomous Runner")
    
    with gr.Tab("File Inspector & Editor"):
        file_input = gr.Textbox(label="File Path (relative to repo)", value="src/components/TrainingPlan.tsx")
        read_btn = gr.Button("Read File from Repo")
        file_output = gr.Code(label="File Contents", language="typescript")
        
        read_btn.click(fn=read_file, inputs=file_input, outputs=file_output)
        
        with gr.Row():
            commit_msg_input = gr.Textbox(label="Commit Message", value="Odysseus: Automated update")
            save_btn = gr.Button("Save, Commit & Push to GitHub", variant="primary")
            
        save_output = gr.Textbox(label="Execution Status")
        save_btn.click(fn=write_and_commit_file, inputs=[file_input, file_output, commit_msg_input], outputs=save_output)

if __name__ == "__main__":
    demo.launch(server_name="127.0.0.1", server_port=7860)

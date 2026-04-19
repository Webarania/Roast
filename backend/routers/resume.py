import io
import logging

import pdfplumber
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from slowapi import Limiter
from slowapi.util import get_remote_address

import storage
from config import MAX_FILE_SIZE_MB
from services.ai_gateway import parse_resume

router = APIRouter()
logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)


@router.post("/upload")
@limiter.limit("5/minute")
async def upload_resume(request: Request, file: UploadFile = File(...)):
    """Upload a PDF resume, parse it, and create a session."""

    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400, detail=f"File size exceeds {MAX_FILE_SIZE_MB}MB limit"
        )

    # Extract text from PDF (optimized for speed)
    try:
        pdf_text = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            # Only process first 3 pages to stay under Render's 30s timeout
            for page in pdf.pages[:3]:
                text = page.extract_text()
                if text:
                    pdf_text += text + "\n"
    except Exception as e:
        logger.error(f"PDF parsing error: {e}")
        raise HTTPException(status_code=400, detail="Could not read PDF. Please check the file.")

    if not pdf_text.strip():
        raise HTTPException(
            status_code=400, detail="PDF appears to be empty or contains no readable text"
        )

    # Parse resume with AI
    try:
        parsed = await parse_resume(pdf_text)
        
        # Stricter tech validation using AI's judgment
        if parsed.get("is_tech_resume") is False:
            reason = parsed.get("reasoning", "This file doesn't look like a technical CV or professional resume.")
            raise HTTPException(
                status_code=400,
                detail=f"Validation Failed: {reason} Please upload a real developer resume."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI parsing error: {e}")
        # 200+ Comprehensive Tech Keywords
        tech_keywords = [
            # Programming Languages
            "python", "javascript", "typescript", "java", "c++", "c#", "ruby", "rust", "go", "golang", "swift", "kotlin", "php", "dart", "sql", "plsql", "t-sql", "nosql",
            "scala", "elixir", "erlang", "haskell", "clojure", "perl", "lua", "r", "matlab", "julia", "fortran", "cobol", "assembly", "objective-c", "groovy",
            "f#", "ocaml", "zig", "nim", "crystal", "v", "solidity",
            # Frontend Frameworks
            "react", "angular", "vue", "svelte", "next.js", "nuxt", "gatsby", "remix", "astro", "qwik", "solid.js", "alpine.js", "htmx", "lit", "stencil",
            # Backend Frameworks
            "express", "node.js", "django", "flask", "fastapi", "spring boot", "spring", "laravel", "rails", "asp.net", ".net", "nestjs", "koa", "hapi",
            "gin", "echo", "fiber", "actix", "rocket", "phoenix", "sinatra", "strapi", "adonis", "sails",
            # Cloud & DevOps
            "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s", "terraform", "ansible", "jenkins", "ci/cd", "github actions", "gitlab ci", "circleci",
            "pulumi", "cloudformation", "helm", "istio", "prometheus", "grafana", "datadog", "new relic", "splunk", "nagios", "vagrant", "packer",
            "argocd", "spinnaker", "tekton", "openshift", "rancher", "eks", "aks", "gke", "lambda", "cloud functions", "fargate",
            # Databases
            "mongodb", "postgresql", "mysql", "redis", "elasticsearch", "cassandra", "dynamodb", "oracle", "mariadb", "sqlite", "neo4j", "firebase", "supabase",
            "cockroachdb", "planetscale", "vitess", "couchdb", "influxdb", "timescaledb", "clickhouse", "snowflake", "bigquery", "redshift",
            # Data & AI/ML
            "devops", "sre", "mlops", "data engineering", "data science", "machine learning", "deep learning", "ai", "artificial intelligence", "nlp", "computer vision",
            "pytorch", "tensorflow", "keras", "scikit-learn", "pandas", "numpy", "spark", "hadoop", "kafka", "flink", "airflow", "dbt", "tableau", "power bi",
            "llm", "langchain", "hugging face", "openai", "gpt", "bert", "transformers", "rag", "vector database", "pinecone", "weaviate", "chromadb",
            "opencv", "matplotlib", "seaborn", "plotly", "streamlit", "gradio", "mlflow", "kubeflow", "sagemaker", "vertex ai",
            # Security
            "cybersecurity", "infosec", "pentesting", "ethical hacking", "siem", "soc", "firewall", "network", "tcp/ip", "dns", "dhcp", "linux", "unix", "ubuntu", "centos",
            "owasp", "burp suite", "nmap", "wireshark", "metasploit", "kali", "zero trust", "oauth", "jwt", "saml", "openid",
            # Enterprise / ERP
            "sap", "abap", "hana", "fiori", "basis", "succesfactors", "salesforce", "apex", "soql", "mulesoft", "servicenow", "powerapps", "dynamics 365",
            "workday", "oracle erp", "netsuite", "odoo", "zoho",
            # UI / Design / Frontend Libs
            "html", "css", "sass", "less", "tailwind", "bootstrap", "material ui", "chakra ui", "three.js", "webgl", "d3.js", "gsap", "unity", "unreal engine",
            "figma", "sketch", "adobe xd", "storybook", "framer motion", "lottie", "canvas", "svg", "webassembly", "wasm",
            # Mobile
            "ios", "android", "react native", "flutter", "xamarin", "capacitor", "cordova", "ionic", "swiftui", "jetpack compose",
            "expo", "maui", "kotlin multiplatform",
            # Tools & Practices
            "git", "bitbucket", "jira", "confluence", "trello", "agile", "scrum", "kanban", "graphql", "rest api", "grpc", "soap", "microservices", "serverless",
            "webpack", "vite", "rollup", "esbuild", "parcel", "babel", "eslint", "prettier", "npm", "yarn", "pnpm",
            # Blockchain & Web3
            "blockchain", "ethereum", "smart contracts", "web3", "hardhat", "truffle", "polygon", "defi", "nft",
            # Embedded & IoT
            "embedded", "rtos", "arduino", "raspberry pi", "firmware", "verilog", "vhdl", "iot", "mqtt", "zigbee", "lora",
            # Testing & QA
            "qa", "automation", "selenium", "cypress", "playwright", "jest", "mocha", "chai", "postman", "jmeter", "k6",
            "pytest", "junit", "testng", "robot framework", "appium", "detox", "vitest", "testing library",
            # Message Queues & Streaming
            "rabbitmq", "celery", "bull", "nats", "pulsar", "zeromq", "activemq",
        ]
        text_lower = pdf_text.lower()
        
        # Heuristic: If it has tech keywords but is too short, or has documentation keywords, it might just be a block of text
        doc_keywords = ["handoff", "documentation", "manual", "guide", "specification", "api spec", "technical report"]
        is_doc = any(dk in text_lower for dk in doc_keywords)
        
        if not any(kw in text_lower for kw in tech_keywords) or len(pdf_text.split()) < 40 or is_doc:
            raise HTTPException(
                status_code=400,
                detail="This doesn't look like a real tech resume. It looks like a technical document or manual.",
            )
        
        parsed = {
            "name": "Developer",
            "skills": [],
            "projects": [],
            "experience_level": "junior",
        }

    # Create session
    session_id = storage.create_session()
    resume_data = {
        "name": parsed.get("name") or "Developer",
        "job_title": parsed.get("job_title", "Software Developer"),
        "domain": parsed.get("domain", "Software Development"),
        "skills": parsed.get("skills", [])[:20],
        "projects": parsed.get("projects", [])[:5],
        "experience_level": parsed.get("experience_level", "junior"),
        "years_of_experience": parsed.get("years_of_experience", 0),
        "work_experience": parsed.get("work_experience", [])[:3],
        "raw_text": pdf_text[:3000],
    }
    storage.update_session(session_id, "resume_data", resume_data)

    # Extract contact info from parsed resume for dedup
    email = parsed.get("email", "").strip()
    mobile = parsed.get("mobile", "").strip()
    if email:
        storage.update_session(session_id, "email", email)
    if mobile:
        storage.update_session(session_id, "mobile", mobile)

    return {
        "session_id": session_id,
        "resume_data": resume_data,
        "message": "Resume parsed successfully",
    }

const academies = {
      "evolve-fitness": {"name": "Evolve Fitness", "icon": "\u2728", "description": "Evolve Fitness is coming soon. Check back for launch updates.", "topics": ["In development", "Coming Soon"]},
      "doc-in-poc": {"name": "Doc in Poc", "icon": "\u2728", "description": "Doc in Poc is coming soon. Check back for launch updates.", "topics": ["In development", "Coming Soon"]},
      "essence": {"name": "Essence", "icon": "\u2728", "description": "Essence is coming soon. Check back for launch updates.", "topics": ["In development", "Coming Soon"]},
      aws: { name: "AWS Academy", icon: "☁️", description: "Build your cloud foundations with guided AWS concepts and practical learning. This academy is in the works.", topics: ["Cloud foundations", "AWS services", "Security & IAM"] },
      "etl-elt": { name: "ETL/ELT Academy", icon: "🔄", description: "Explore how data moves, transforms and reaches the systems that use it. A practical data pipeline learning experience is on the way.", topics: ["ETL & ELT", "Data pipelines", "Quality & orchestration"] },
      "software-engineering": { name: "Software Engineering Academy", icon: "🛠️", description: "Learn the foundations of designing, building, testing and shipping reliable software. This hands-on academy is in development.", topics: ["Software design", "Development practices", "Testing & delivery"] },
      locked: { name: "Classified Project", icon: "🔒", description: "A confidential enterprise platform under active stealth development. Architecture, security benchmarks, and deployment tooling are being finalized.", topics: ["Stealth Mode", "Enterprise Security", "Cloud Scale", "Coming Soon"] },
      "prashi-institute": { name: "Prashi Institute", icon: "🎓", description: "High-impact tech career acceleration and professional curriculum for engineering minds.", topics: ["Full-Stack Engineering", "System Design", "Cloud & DevOps", "Masterclasses"] }
    };
    const requestedProject = new URLSearchParams(location.search).get("project");
    if (requestedProject === "aws") location.replace("../AWS_PRJ/index.html");
    const academy = academies[requestedProject] || academies.aws;
    document.title = `${academy.name} · Launching Soon · MegaByte`;
    document.querySelector("#academyIcon").textContent = academy.icon;
    document.querySelector("#academyName").innerHTML = `${academy.name}<span>Launching Soon</span>`;
    document.querySelector("#academyDescription").textContent = academy.description;
    document.querySelector("#academyTopics").innerHTML = academy.topics.map(topic => `<span>${topic}</span>`).join("");

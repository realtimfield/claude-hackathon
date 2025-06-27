package com.puzzle.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SPAController {
    
    // Forward all non-API routes to index.html for client-side routing
    @GetMapping({"/", "/puzzle/**"})
    public String forward() {
        return "forward:/index.html";
    }
}
package com.example.jenkins;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@SpringBootApplication
@Controller // Changed from @RestController
public class JenkinsApplication {

    public static void main(String[] args) {
        SpringApplication.run(JenkinsApplication.class, args);
    }

    @GetMapping("/")
    public String pipelineInfo() {
        // This tells Spring to look for a file named "index.html" in the templates folder
        return "index"; 
    }
}//jenkins\src\main\java\com\example\jenkins\JenkinsApplication.java
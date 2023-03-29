FROM adoptopenjdk:8-jre-hotspot

COPY ./demo_snowpipe_back.jar /app/demo_snowpipe_back.jar
COPY ./param_snow.json /app/param_snow.json

WORKDIR /app

ENTRYPOINT ["java", "-jar", "demo_snowpipe_back.jar"]
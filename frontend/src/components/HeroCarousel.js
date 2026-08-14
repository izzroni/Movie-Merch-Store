import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "../styles/HeroCarousel.css";

const HeroCarousel = () => {
  return (
    <Swiper
      modules={[Pagination, Navigation, Autoplay]}
      pagination={{ clickable: true }}
      navigation={{
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      }}
      autoplay={{ delay: 3000, disableOnInteraction: false }}
      loop={true}
      spaceBetween={0}
      slidesPerView={1}
      speed={1000}
      className="swiper"
    >
      {/* Slide 1 */}
      <SwiperSlide>
        <div className="carousel-slide">
          <img src="/images/1ll.jpg" alt="Slide 1" className="carousel-image" />
          <div className="carousel-overlay overlay-slide-1">
      <h2>Choosing between superhero swagger and horror chills?</h2>
      <p>Don’t worry, your will is strong enough to grab both at Movie Merch—shop now!</p>
      <button className="carousel-cta">Shop Now</button>
          </div>
        </div>
      </SwiperSlide>

      {/* Slide 2 */}
      <SwiperSlide>
        <div className="carousel-slide">
          <img src="/images/3sl.jpg" alt="Slide 2" className="carousel-image" />
          
          
        </div>
      </SwiperSlide>

      {/* Slide 3 */}
      <SwiperSlide>
        <div className="carousel-slide">
          <img src="/images/2sl.jpg" alt="Slide 3" className="carousel-image" />
    
          
        </div>
      </SwiperSlide>

      {/* Navigation Buttons */}
      <div className="swiper-button-prev"></div>
      <div className="swiper-button-next"></div>
    </Swiper>
  );
};

export default HeroCarousel;
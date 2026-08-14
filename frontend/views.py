from django.shortcuts import render

def home(request):
    return render(request, 'home.html')  # Instead of 'frontend/home.html'
